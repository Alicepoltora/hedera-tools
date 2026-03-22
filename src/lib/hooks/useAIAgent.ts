import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useHedera } from './useHedera';
import { useTransfer } from './useTransfer';
import { useTokenCreate } from './useTokenCreate';
import { useTokenBurn } from './useTokenBurn';
import { useScheduledTransaction } from './useScheduledTransaction';
import { useHCS } from './useHCS';
import { useTokenAssociate } from './useTokenAssociate';

// ─────────────────────────────────────────────────────────────────────────────
// Types (shared with /api/ai-agent.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type AIActionType =
  | 'transfer_hbar'
  | 'create_token'
  | 'burn_tokens'
  | 'schedule_transfer'
  | 'submit_hcs_message'
  | 'associate_token'
  | 'explain_portfolio';

export interface AIAction {
  type: AIActionType;
  params: Record<string, unknown>;
  confirmationRequired: boolean;
  description: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Pending action attached to this message (before user confirms) */
  action?: AIAction;
  /** Result of executing the action */
  actionResult?: {
    success: boolean;
    txId?: string | null;
    tokenId?: string | null;
    error?: string;
  };
  timestamp: Date;
}

export interface UseAIAgentOptions {
  /** API endpoint. Defaults to /api/ai-agent */
  apiEndpoint?: string;
}

export interface UseAIAgentResult {
  messages: ChatMessage[];
  loading: boolean;
  executing: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (messageId: string) => Promise<void>;
  cancelAction: (messageId: string) => void;
  clearChat: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo mode — scripted responses when no API key / demoMode
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_DELAY = 1200;

function getDemoResponse(text: string, balance: number | null): { message: string; action?: AIAction } {
  const lower = text.toLowerCase();

  if (lower.includes('баланс') || lower.includes('balance') || lower.includes('сколько')) {
    return {
      message: `На вашем кошельке **${balance?.toFixed(2) ?? '1234.56'} HBAR** (~$${((balance ?? 1234.56) * 0.004).toFixed(2)} USD). Хотите что-то сделать с этими средствами?`,
    };
  }

  if (lower.includes('отправ') || lower.includes('send') || lower.includes('transfer') || lower.includes('перевод')) {
    return {
      message: 'Я готов отправить HBAR. Подтвердите транзакцию:',
      action: {
        type: 'transfer_hbar',
        params: { to: '0.0.98', amount: 5 },
        confirmationRequired: true,
        description: 'Send 5 HBAR → 0.0.98',
      },
    };
  }

  if (lower.includes('создай') || lower.includes('create') || lower.includes('token') || lower.includes('токен')) {
    return {
      message: 'Создаю новый токен. Подтвердите:',
      action: {
        type: 'create_token',
        params: { name: 'Demo Token', symbol: 'DMT', type: 'FUNGIBLE', initialSupply: 1000, decimals: 2 },
        confirmationRequired: true,
        description: 'Create token "Demo Token" (DMT)',
      },
    };
  }

  if (lower.includes('nft') || lower.includes('коллекц')) {
    return {
      message: 'Создаю NFT коллекцию. Подтвердите:',
      action: {
        type: 'create_token',
        params: { name: 'Demo Collection', symbol: 'DEMO', type: 'NFT', maxSupply: 100 },
        confirmationRequired: true,
        description: 'Create NFT collection "Demo Collection"',
      },
    };
  }

  if (lower.includes('hcs') || lower.includes('сообщен') || lower.includes('message') || lower.includes('топик')) {
    return {
      message: 'Отправляю сообщение в HCS топик. Подтвердите:',
      action: {
        type: 'submit_hcs_message',
        params: { topicId: '0.0.9999999', message: text },
        confirmationRequired: true,
        description: `Submit to topic 0.0.9999999`,
      },
    };
  }

  if (lower.includes('стейк') || lower.includes('staking') || lower.includes('награда') || lower.includes('reward')) {
    return {
      message:
        'Ваш аккаунт стейкает на **Node 3**. Ожидаемая награда: **0.42 HBAR**. APR сети сейчас ~6.5%. Для изменения ноды или вывода наград нужно подписать транзакцию через кошелёк.',
    };
  }

  if (lower.includes('hedera') || lower.includes('что') || lower.includes('what') || lower.includes('как') || lower.includes('help') || lower.includes('помог')) {
    return {
      message:
        'Я AI-ассистент встроенный в hedera-ui-kit. Могу помочь с:\n\n• **Отправкой HBAR** — "отправь 5 HBAR на 0.0.98"\n• **Созданием токенов** — "создай токен Carbon Credit"\n• **HCS сообщениями** — "запиши в топик 0.0.123 данные о транзакции"\n• **Стейкингом** — "покажи мои награды"\n• **Вопросами о Hedera** — спрашивай что угодно',
    };
  }

  return {
    message:
      'Понял вас. В demo режиме я могу симулировать операции: отправку HBAR, создание токенов, запись в HCS. Попробуйте написать "отправь 5 HBAR" или "создай токен".',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAIAgent(options: UseAIAgentOptions = {}): UseAIAgentResult {
  const { apiEndpoint = '/api/ai-agent' } = options;
  const { accountId, balance, network, demoMode } = useHedera();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        demoMode
          ? "Hey! I'm the hedera-ui-kit AI agent. Running in demo mode — ask about your balance, try sending HBAR or creating a token to see how it works."
          : "Hey! I'm the hedera-ui-kit AI agent. I can execute Hedera operations from natural language. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hedera action hooks
  const { transfer } = useTransfer();
  const { createToken } = useTokenCreate();
  const { burnFungible } = useTokenBurn();
  const { scheduleTransfer } = useScheduledTransaction();
  const { submitMessage: submitHCS } = useHCS();
  const { associate } = useTokenAssociate();

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const full: ChatMessage = { ...msg, id: `${Date.now()}-${Math.random()}`, timestamp: new Date() };
    setMessages((prev) => [...prev, full]);
    return full.id;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setError(null);

      addMessage({ role: 'user', content: text });
      setLoading(true);

      // Demo mode — no real API call
      if (demoMode || !apiEndpoint) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const demo = getDemoResponse(text, balance);
        addMessage({ role: 'assistant', content: demo.message, action: demo.action });
        setLoading(false);
        return;
      }

      // Build history for the API (exclude welcome + system msgs)
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      history.push({ role: 'user', content: text });

      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            context: { accountId, balance, network, demoMode },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error ?? 'AI request failed');
        }

        const data = await res.json() as { message: string; action?: AIAction };
        addMessage({ role: 'assistant', content: data.message, action: data.action });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI request failed';
        setError(msg);
        addMessage({ role: 'assistant', content: `⚠️ ${msg}` });
      } finally {
        setLoading(false);
      }
    },
    [messages, accountId, balance, network, demoMode, apiEndpoint, addMessage]
  );

  const confirmAction = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.action) return;

      const { type, params } = msg.action;
      setExecuting(true);

      // Remove pending action from the message while executing
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, action: undefined } : m))
      );

      const toastId = toast.loading(`Executing: ${msg.action.description}…`);

      try {
        let txId: string | null = null;
        let tokenId: string | null = null;

        switch (type) {
          case 'transfer_hbar':
            txId = await transfer(String(params.to), Number(params.amount));
            break;
          case 'create_token':
            tokenId = await createToken({
              name: String(params.name),
              symbol: String(params.symbol),
              type: (params.type as 'FUNGIBLE' | 'NFT'),
              initialSupply: params.initialSupply != null ? Number(params.initialSupply) : undefined,
              decimals: params.decimals != null ? Number(params.decimals) : undefined,
              maxSupply: params.maxSupply != null ? Number(params.maxSupply) : undefined,
              memo: params.memo != null ? String(params.memo) : undefined,
            });
            break;
          case 'burn_tokens':
            txId = await burnFungible(String(params.tokenId), Number(params.amount));
            break;
          case 'schedule_transfer':
            txId = await scheduleTransfer(
              String(params.to),
              Number(params.amount),
              params.memo ? String(params.memo) : undefined
            );
            break;
          case 'submit_hcs_message':
            txId = await submitHCS(String(params.topicId), String(params.message));
            break;
          case 'associate_token':
            txId = await associate(String(params.tokenId));
            break;
        }

        const success = !!(txId ?? tokenId);
        toast.success(success ? '✅ Transaction confirmed' : '⚠️ No result', { id: toastId });

        // Update the message with result
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, actionResult: { success, txId, tokenId } }
              : m
          )
        );

        // Add follow-up confirmation message
        const followUp = txId
          ? `✅ Готово! TX ID: \`${txId}\``
          : tokenId
          ? `✅ Токен создан: \`${tokenId}\``
          : '⚠️ Транзакция не вернула результат.';

        addMessage({ role: 'assistant', content: followUp });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Transaction failed';
        toast.error(`❌ ${errMsg}`, { id: toastId });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, actionResult: { success: false, error: errMsg } }
              : m
          )
        );
        addMessage({ role: 'assistant', content: `❌ Ошибка: ${errMsg}` });
      } finally {
        setExecuting(false);
      }
    },
    [messages, transfer, createToken, burnFungible, scheduleTransfer, submitHCS, associate, addMessage]
  );

  const cancelAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, action: undefined } : m
      )
    );
    addMessage({ role: 'assistant', content: 'Действие отменено.' });
  }, [addMessage]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Чат очищен. Чем могу помочь?',
      timestamp: new Date(),
    }]);
    setError(null);
  }, []);

  return { messages, loading, executing, error, sendMessage, confirmAction, cancelAction, clearChat };
}

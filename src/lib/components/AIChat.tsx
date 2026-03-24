import { useRef, useState, useEffect, type KeyboardEvent } from 'react';
import { useAIAgent, type ChatMessage, type AIAction } from '../hooks/useAIAgent';
import { useHedera } from '../hooks/useHedera';

export interface AIChatProps {
  /** Custom API endpoint. Defaults to /api/ai-agent */
  apiEndpoint?: string;
  /** Placeholder for the input */
  placeholder?: string;
  /** Max height of the messages area. Default: 420px */
  maxHeight?: number;
  /** Extra CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick action chips
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'My balance', text: 'What is my current HBAR balance?' },
  { label: 'Send HBAR', text: 'Send 5 HBAR to 0.0.98' },
  { label: 'Create token', text: 'Create a token called Carbon Credit with symbol CCR and 1000 initial supply' },
  { label: 'Create NFT', text: 'Create an NFT collection called Pixel Cats with a max supply of 100' },
  { label: 'HCS message', text: 'Submit to topic 0.0.8359467: {"event":"deploy","version":"1.1.0"}' },
  { label: 'Help', text: 'What can you do?' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Action confirmation card
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  transfer_hbar: '↗',
  create_token: '🪙',
  burn_tokens: '🔥',
  schedule_transfer: '📅',
  submit_hcs_message: '💬',
  associate_token: '🔗',
  explain_portfolio: '📊',
};

const ACTION_COLORS: Record<string, string> = {
  transfer_hbar: 'border-violet-600/40 bg-violet-950/20',
  create_token: 'border-emerald-600/40 bg-emerald-950/20',
  burn_tokens: 'border-red-600/40 bg-red-950/20',
  schedule_transfer: 'border-blue-600/40 bg-blue-950/20',
  submit_hcs_message: 'border-teal-600/40 bg-teal-950/20',
  associate_token: 'border-amber-600/40 bg-amber-950/20',
};

function ActionCard({
  action,
  messageId,
  onConfirm,
  onCancel,
  executing,
}: {
  action: AIAction;
  messageId: string;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  executing: boolean;
}) {
  const colorClass = ACTION_COLORS[action.type] ?? 'border-slate-700 bg-slate-800/40';

  return (
    <div className={`mt-2 rounded-xl border p-3.5 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{ACTION_ICONS[action.type] ?? '⚡'}</span>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Pending Action</p>
          <p className="text-sm font-semibold text-white">{action.description}</p>
        </div>
      </div>

      {/* Params preview */}
      <div className="bg-slate-900/60 rounded-lg p-2.5 mb-3 text-xs font-mono text-slate-400">
        {Object.entries(action.params).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-slate-600">{k}:</span>
            <span className="text-slate-200">{String(v)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(messageId)}
          disabled={executing}
          className="flex-1 py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {executing ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Signing…
            </span>
          ) : (
            '✓ Confirm & Sign'
          )}
        </button>
        <button
          onClick={() => onCancel(messageId)}
          disabled={executing}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onConfirm,
  onCancel,
  executing,
}: {
  msg: ChatMessage;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  executing: boolean;
}) {
  const isUser = msg.role === 'user';

  // Parse **bold** and `code` markdown
  const renderContent = (text: string) => {
    // Strip internal step-tracking sentinels — they're in content for state
    // detection but must not appear in the rendered chat bubble.
    const clean = text.replace(/\n?__AWAITING_\w+__/g, '');
    const parts = clean.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="text-xs bg-slate-700 px-1.5 py-0.5 rounded font-mono text-violet-300">{part.slice(1, -1)}</code>;
      }
      if (part === '\n') return <br key={i} />;
      if (part.startsWith('• ')) return <span key={i} className="block pl-2">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
          AI
        </div>
      )}

      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-violet-600 text-white rounded-tr-sm'
              : 'bg-slate-800 text-slate-200 rounded-tl-sm'
          }`}
        >
          {renderContent(msg.content)}
        </div>

        {/* Pending action card */}
        {msg.action && (
          <div className="w-full">
            <ActionCard
              action={msg.action}
              messageId={msg.id}
              onConfirm={onConfirm}
              onCancel={onCancel}
              executing={executing}
            />
          </div>
        )}

        {/* Action result */}
        {msg.actionResult && (
          <div className={`text-xs px-2.5 py-1.5 rounded-lg ${
            msg.actionResult.success
              ? 'bg-emerald-950/30 text-emerald-400'
              : 'bg-red-950/30 text-red-400'
          }`}>
            {msg.actionResult.success ? '✅ Executed' : `❌ ${msg.actionResult.error ?? 'Transaction failed'}`}
            {msg.actionResult.txId && (
              <span className="font-mono ml-1 opacity-70">
                {msg.actionResult.txId.slice(0, 24)}…
              </span>
            )}
          </div>
        )}

        <span className="text-xs text-slate-600">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing indicator
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
        AI
      </div>
      <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fully functional AI chat interface for Hedera blockchain operations.
 * Understands natural language and executes transactions via connected wallet.
 *
 * Requires `<HederaProvider>` in the tree.
 * For real AI responses, set `ANTHROPIC_API_KEY` in Vercel environment variables.
 * Without the key, runs in demo mode with scripted responses.
 *
 * @example
 * <AIChat placeholder="Ask me anything about Hedera…" />
 */
export function AIChat({
  apiEndpoint = '/api/ai-agent',
  placeholder = 'Ask me anything — "send 5 HBAR to 0.0.98", "create a token"…',
  maxHeight = 420,
  className = '',
}: AIChatProps) {
  const { isConnected, demoMode } = useHedera();
  const { messages, loading, executing, sendMessage, confirmAction, cancelAction, clearChat } =
    useAIAgent({ apiEndpoint });

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || executing) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleQuickAction = (text: string) => {
    void sendMessage(text);
  };

  return (
    <div className={`flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hedera AI Agent</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-500">
                {demoMode ? 'demo mode' : isConnected ? 'connected' : 'wallet not connected'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded"
          title="Clear chat"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight, minHeight: 200 }}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onConfirm={confirmAction}
            onCancel={cancelAction}
            executing={executing}
          />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick action chips */}
      {(
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAction(qa.text)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-800 rounded-xl border border-slate-700 focus-within:border-violet-500 transition-colors p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={loading || executing}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none max-h-28 overflow-y-auto leading-relaxed py-1 px-1"
            style={{ minHeight: '2rem' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading || executing}
            className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-700 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

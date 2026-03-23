import Groq from 'groq-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentContext {
  accountId: string | null;
  balance: number | null;
  network: string;
  demoMode: boolean;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentAction {
  type:
    | 'transfer_hbar'
    | 'create_token'
    | 'burn_tokens'
    | 'schedule_transfer'
    | 'submit_hcs_message'
    | 'associate_token';
  params: Record<string, unknown>;
  confirmationRequired: boolean;
  description: string;
}

export interface AgentResponse {
  message: string;
  action?: AgentAction;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools — OpenAI-compatible format (Groq uses the same)
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: Groq.Chat.CompletionCreateParams['tools'] = [
  {
    type: 'function',
    function: {
      name: 'transfer_hbar',
      description:
        'Transfer HBAR from the connected wallet to another Hedera account.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Destination account ID, e.g. 0.0.12345' },
          amount: { type: 'number', description: 'Amount of HBAR to transfer' },
        },
        required: ['to', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_token',
      description:
        'Create a new HTS token — fungible (like ERC-20) or NFT collection (like ERC-721).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full token name, e.g. "Carbon Credit"' },
          symbol: { type: 'string', description: 'Token ticker, e.g. "CCR"' },
          type: { type: 'string', description: 'FUNGIBLE or NFT' },
          initialSupply: { type: 'number', description: 'Initial supply (fungible only)' },
          decimals: { type: 'number', description: 'Decimal places (fungible only)' },
          maxSupply: { type: 'number', description: 'Max supply cap (optional)' },
          memo: { type: 'string', description: 'On-chain memo (optional)' },
        },
        required: ['name', 'symbol', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'burn_tokens',
      description: 'Burn (permanently destroy) fungible HTS tokens.',
      parameters: {
        type: 'object',
        properties: {
          tokenId: { type: 'string', description: 'Token ID, e.g. 0.0.1234567' },
          amount: { type: 'number', description: 'Number of tokens to burn' },
        },
        required: ['tokenId', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_transfer',
      description:
        'Create a scheduled HBAR transfer requiring multiple signatures.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Destination account ID' },
          amount: { type: 'number', description: 'Amount of HBAR' },
          memo: { type: 'string', description: 'Payment description (optional)' },
        },
        required: ['to', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_hcs_message',
      description:
        'Submit a message to a Hedera Consensus Service topic.',
      parameters: {
        type: 'object',
        properties: {
          topicId: { type: 'string', description: 'HCS topic ID, e.g. 0.0.9999999' },
          message: { type: 'string', description: 'Message content to submit' },
        },
        required: ['topicId', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'associate_token',
      description:
        'Associate a token with the connected account so it can receive that token.',
      parameters: {
        type: 'object',
        properties: {
          tokenId: { type: 'string', description: 'Token ID to associate, e.g. 0.0.1234567' },
        },
        required: ['tokenId'],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: AgentContext): string {
  return `You are an AI assistant built into the hedera-ui-kit — a React component library for Hedera blockchain developers.

## Current wallet state
- Account ID: ${ctx.accountId ?? 'Not connected'}
- Balance: ${ctx.balance != null ? `${ctx.balance.toFixed(4)} HBAR` : 'Unknown'}
- Network: ${ctx.network}
- Mode: ${ctx.demoMode ? 'Demo (simulated)' : 'Live'}

## Your capabilities
You can help users perform blockchain operations using these functions:
- transfer_hbar → send HBAR to another account
- create_token → create a new HTS fungible token or NFT collection
- burn_tokens → destroy tokens and reduce supply
- schedule_transfer → create a multi-sig scheduled payment
- submit_hcs_message → log data on-chain via Hedera Consensus Service
- associate_token → link a token to the user's account

## Rules
1. Always describe what will happen BEFORE calling a function — the UI will show a confirmation card
2. Answer balance/account questions from context above (no function call needed)
3. If wallet is not connected, tell the user to connect their wallet first
4. Be concise — 1-3 sentences for simple answers
5. Respond in the same language the user writes in

## CRITICAL: Collecting required parameters conversationally
NEVER call a function unless you have ALL required parameters explicitly provided by the user in this conversation.
DO NOT invent, guess, or use placeholder values for any parameter.

For transfer_hbar and schedule_transfer:
- If the user has not stated the exact amount → ask "How much HBAR would you like to send?" and wait
- If the user has not stated the recipient account ID → ask "What is the recipient's account ID (e.g. 0.0.12345)?" and wait
- Only call transfer_hbar / schedule_transfer once you have BOTH amount AND recipient from the user's own words

For burn_tokens:
- If the user has not stated the token ID and amount → ask for them before calling the function

For submit_hcs_message:
- If the user has not stated the topic ID → ask for it before calling the function

For create_token / associate_token:
- If name, symbol, or token ID are missing → ask before calling

In short: collect every required parameter through conversation first, then call the function exactly once with the values the user provided.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action description for UI card
// ─────────────────────────────────────────────────────────────────────────────

function buildActionDescription(
  type: AgentAction['type'],
  params: Record<string, unknown>
): string {
  switch (type) {
    case 'transfer_hbar':
      return `Send ${params.amount} HBAR → ${params.to}`;
    case 'create_token':
      return `Create ${params.type === 'NFT' ? 'NFT collection' : 'token'} "${params.name}" (${params.symbol})`;
    case 'burn_tokens':
      return `Burn ${params.amount} tokens from ${params.tokenId}`;
    case 'schedule_transfer':
      return `Schedule ${params.amount} HBAR → ${params.to}${params.memo ? ` (${params.memo})` : ''}`;
    case 'submit_hcs_message':
      return `Submit to topic ${params.topicId}: "${String(params.message).slice(0, 40)}${String(params.message).length > 40 ? '…' : ''}"`;
    case 'associate_token':
      return `Associate token ${params.tokenId} with your account`;
    default:
      return 'Execute action';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vercel handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const { messages, context } = req.body as {
    messages: AgentMessage[];
    context: AgentContext;
  };

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  try {
    const groq = new Groq({ apiKey });

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = completion.choices[0];
    const responseMessage = choice.message;

    let message = responseMessage.content ?? '';
    let action: AgentAction | undefined;

    if (responseMessage.tool_calls?.length) {
      const toolCall = responseMessage.tool_calls[0];
      const fnName = toolCall.function.name as AgentAction['type'];
      const params = JSON.parse(toolCall.function.arguments ?? '{}') as Record<string, unknown>;

      action = {
        type: fnName,
        params,
        confirmationRequired: true,
        description: buildActionDescription(fnName, params),
      };

      // If no text, generate a short confirmation prompt
      if (!message) {
        message = `I'll ${buildActionDescription(fnName, params)}. Please confirm below.`;
      }
    }

    const agentResponse: AgentResponse = { message, action };
    return res.status(200).json(agentResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI request failed';
    return res.status(500).json({ error: msg });
  }
}

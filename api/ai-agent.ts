import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentContext {
  accountId: string | null;
  balance: number | null;
  network: string;
  demoMode: boolean;
  recentTxCount?: number;
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
    | 'associate_token'
    | 'explain_portfolio';
  params: Record<string, unknown>;
  confirmationRequired: boolean;
  description: string; // human-readable preview
}

export interface AgentResponse {
  message: string;
  action?: AgentAction;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions — these map 1:1 to hedera-ui-kit hooks
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'transfer_hbar',
    description:
      'Transfer HBAR from the connected wallet to another Hedera account. Use when user wants to send, pay, or transfer HBAR.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Destination Hedera account ID in format 0.0.XXXXX',
        },
        amount: {
          type: 'number',
          description: 'Amount of HBAR to transfer (whole units, e.g. 5 for 5 HBAR)',
        },
      },
      required: ['to', 'amount'],
    },
  },
  {
    name: 'create_token',
    description:
      'Create a new HTS token — either fungible (like ERC-20) or NFT collection (like ERC-721). Use when user wants to create, launch, or deploy a token.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full token name, e.g. "Carbon Credit"' },
        symbol: { type: 'string', description: 'Token symbol/ticker, e.g. "CCR"' },
        type: {
          type: 'string',
          enum: ['FUNGIBLE', 'NFT'],
          description: 'FUNGIBLE for regular tokens, NFT for non-fungible collections',
        },
        initialSupply: {
          type: 'number',
          description: 'Initial token supply (fungible only). Defaults to 0.',
        },
        decimals: {
          type: 'number',
          description: 'Decimal places (fungible only). Defaults to 2.',
        },
        maxSupply: {
          type: 'number',
          description: 'Maximum supply cap. If omitted, supply is infinite.',
        },
        memo: { type: 'string', description: 'Optional on-chain memo' },
      },
      required: ['name', 'symbol', 'type'],
    },
  },
  {
    name: 'burn_tokens',
    description:
      'Burn (permanently destroy) fungible HTS tokens. Use when user wants to burn, destroy, or reduce supply.',
    input_schema: {
      type: 'object',
      properties: {
        tokenId: { type: 'string', description: 'Token ID to burn from, e.g. 0.0.1234567' },
        amount: { type: 'number', description: 'Number of tokens to burn (whole units)' },
      },
      required: ['tokenId', 'amount'],
    },
  },
  {
    name: 'schedule_transfer',
    description:
      'Create a scheduled HBAR transfer that requires multiple signatures. Use for deferred payments, multi-sig, or team payments.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Destination account ID' },
        amount: { type: 'number', description: 'Amount of HBAR' },
        memo: { type: 'string', description: 'Description of the payment purpose' },
      },
      required: ['to', 'amount'],
    },
  },
  {
    name: 'submit_hcs_message',
    description:
      'Submit a message to a Hedera Consensus Service topic. Use when user wants to log, record, or publish data on-chain.',
    input_schema: {
      type: 'object',
      properties: {
        topicId: { type: 'string', description: 'HCS topic ID, e.g. 0.0.9999999' },
        message: { type: 'string', description: 'Message content to submit' },
      },
      required: ['topicId', 'message'],
    },
  },
  {
    name: 'associate_token',
    description:
      'Associate a token with the connected account so it can receive that token. Required before receiving any HTS token.',
    input_schema: {
      type: 'object',
      properties: {
        tokenId: { type: 'string', description: 'Token ID to associate, e.g. 0.0.1234567' },
      },
      required: ['tokenId'],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// System prompt — gives Claude full knowledge of the hedera-ui-kit context
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: AgentContext): string {
  return `You are an AI assistant built into the hedera-ui-kit — a React component library for Hedera blockchain developers.

## Current wallet state
- Account ID: ${ctx.accountId ?? 'Not connected'}
- Balance: ${ctx.balance != null ? `${ctx.balance.toFixed(4)} HBAR` : 'Unknown'}
- Network: ${ctx.network}
- Mode: ${ctx.demoMode ? 'Demo (simulated)' : 'Live'}

## Your capabilities
You can help users perform blockchain operations by using the available tools. Each tool maps directly to a hook in the hedera-ui-kit library:
- transfer_hbar → useTransfer()
- create_token → useTokenCreate()
- burn_tokens → useTokenBurn()
- schedule_transfer → useScheduledTransaction()
- submit_hcs_message → useHCS()
- associate_token → useTokenAssociate()

## Rules
1. Always confirm before executing transactions — never call a tool without warning the user what will happen
2. When a user asks about their balance or account, answer from the context above (no tool needed)
3. If the user's intent is ambiguous, ask a clarifying question before calling a tool
4. For amounts, always confirm units (HBAR vs tokens vs USD)
5. If wallet is not connected (accountId is null), tell the user to connect their wallet first
6. Be concise — max 2-3 sentences for simple questions, use bullet points for complex answers
7. You can explain Hedera concepts (HTS, HCS, staking, fees) when asked
8. When you call a tool, the UI will show a confirmation card with a "Confirm" button — tell the user to confirm
9. Respond in the same language the user writes in`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action descriptions for UI
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { messages, context } = req.body as {
    messages: AgentMessage[];
    context: AgentContext;
  };

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      tools: TOOLS,
      tool_choice: { type: 'auto' },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Extract text response
    const textBlock = response.content.find((b) => b.type === 'text');
    const toolUseBlock = response.content.find((b) => b.type === 'tool_use');

    const message = textBlock?.type === 'text' ? textBlock.text : '';

    let action: AgentAction | undefined;

    if (toolUseBlock?.type === 'tool_use') {
      const type = toolUseBlock.name as AgentAction['type'];
      const params = toolUseBlock.input as Record<string, unknown>;

      action = {
        type,
        params,
        confirmationRequired: true,
        description: buildActionDescription(type, params),
      };
    }

    const result: AgentResponse = { message, action };
    return res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI request failed';
    return res.status(500).json({ error: msg });
  }
}

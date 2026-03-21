import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface AccountTransaction {
  transactionId: string;
  type: string;
  result: string;
  consensusTimestamp: string;
  /** Total HBAR movement for this account (+credit / -debit) */
  hbarDelta: number;
  transfers: Array<{
    accountId: string;
    amount: number; // HBAR
  }>;
  tokenTransfers: Array<{
    tokenId: string;
    accountId: string;
    amount: number;
  }>;
  memo: string;
  charged_tx_fee: number;
  hashscanUrl: string;
}

export interface UseAccountTransactionsOptions {
  limit?: number;
  /** Unix timestamp in seconds — only return txs after this time */
  afterTimestamp?: number;
  transactionType?: string;
}

export interface UseAccountTransactionsResult {
  transactions: AccountTransaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const HASHSCAN_BASE: Record<string, string> = {
  testnet: 'https://hashscan.io/testnet/transaction',
  mainnet: 'https://hashscan.io/mainnet/transaction',
  previewnet: 'https://hashscan.io/testnet/transaction',
};

const now = Date.now();
const DEMO_TXS: AccountTransaction[] = [
  {
    transactionId: `0.0.1234567@${Math.floor(now / 1000) - 60}`,
    type: 'CRYPTOTRANSFER',
    result: 'SUCCESS',
    consensusTimestamp: new Date(now - 60000).toISOString(),
    hbarDelta: -5,
    transfers: [
      { accountId: '0.0.1234567', amount: -5 },
      { accountId: '0.0.9999999', amount: 5 },
    ],
    tokenTransfers: [],
    memo: 'Demo transfer',
    charged_tx_fee: 0.001,
    hashscanUrl: 'https://hashscan.io/testnet/transaction/demo',
  },
  {
    transactionId: `0.0.1234567@${Math.floor(now / 1000) - 300}`,
    type: 'TOKENMINT',
    result: 'SUCCESS',
    consensusTimestamp: new Date(now - 300000).toISOString(),
    hbarDelta: 0,
    transfers: [],
    tokenTransfers: [{ tokenId: '0.0.9876543', accountId: '0.0.1234567', amount: 100 }],
    memo: 'Mint 100 CCR',
    charged_tx_fee: 0.002,
    hashscanUrl: 'https://hashscan.io/testnet/transaction/demo2',
  },
  {
    transactionId: `0.0.1234567@${Math.floor(now / 1000) - 3600}`,
    type: 'CRYPTOCREATEACCOUNT',
    result: 'SUCCESS',
    consensusTimestamp: new Date(now - 3600000).toISOString(),
    hbarDelta: 100,
    transfers: [{ accountId: '0.0.1234567', amount: 100 }],
    tokenTransfers: [],
    memo: '',
    charged_tx_fee: 0.05,
    hashscanUrl: 'https://hashscan.io/testnet/transaction/demo3',
  },
];

/**
 * Fetches transaction history for a Hedera account from the Mirror Node.
 * Supports pagination via `fetchMore()`.
 *
 * @example
 * const { transactions, loading } = useAccountTransactions();
 * // transactions[0].type === 'CRYPTOTRANSFER'
 */
export function useAccountTransactions(
  accountId?: string,
  options: UseAccountTransactionsOptions = {}
): UseAccountTransactionsResult {
  const { limit = 25, afterTimestamp, transactionType } = options;
  const { accountId: connectedId, demoMode, network } = useHedera();
  const target = accountId ?? connectedId;

  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextLink, setNextLink] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
  const hashscanBase = HASHSCAN_BASE[network] ?? HASHSCAN_BASE.testnet;

  const parseTx = useCallback(
    (raw: Record<string, unknown>): AccountTransaction => {
      const transfers = ((raw.transfers as Record<string, unknown>[]) ?? []).map((t) => ({
        accountId: t.account as string,
        amount: Number(t.amount) / 1e8,
      }));

      const myTransfer = transfers.find((t) => t.accountId === target);
      const hbarDelta = myTransfer?.amount ?? 0;

      const tokenTransfers = ((raw.token_transfers as Record<string, unknown>[]) ?? []).map((t) => ({
        tokenId: t.token_id as string,
        accountId: t.account as string,
        amount: Number(t.amount),
      }));

      const txId = raw.transaction_id as string;

      return {
        transactionId: txId,
        type: raw.name as string,
        result: raw.result as string,
        consensusTimestamp: raw.consensus_timestamp as string,
        hbarDelta,
        transfers,
        tokenTransfers,
        memo: raw.memo_base64
          ? (() => { try { return atob(raw.memo_base64 as string); } catch { return ''; } })()
          : '',
        charged_tx_fee: Number(raw.charged_tx_fee ?? 0) / 1e8,
        hashscanUrl: `${hashscanBase}/${txId}`,
      };
    },
    [target, hashscanBase]
  );

  const buildUrl = useCallback(
    (nextUrl?: string) => {
      if (nextUrl) return nextUrl.startsWith('http') ? nextUrl : `${mirror}${nextUrl}`;
      const params = new URLSearchParams({ limit: String(limit), order: 'desc' });
      if (afterTimestamp) params.set('timestamp', `gt:${afterTimestamp}.000000000`);
      if (transactionType) params.set('transactiontype', transactionType);
      return `${mirror}/api/v1/transactions?account.id=${target}&${params}`;
    },
    [mirror, target, limit, afterTimestamp, transactionType]
  );

  const fetchPage = useCallback(
    async (url: string, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Mirror Node ${res.status}`);
        const data = await res.json();
        const parsed: AccountTransaction[] = (data.transactions ?? []).map(parseTx);
        setTransactions((prev) => (append ? [...prev, ...parsed] : parsed));
        setNextLink(data.links?.next ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    },
    [parseTx]
  );

  const refetch = useCallback(async () => {
    if (!target) return;
    if (demoMode) { setTransactions(DEMO_TXS); return; }
    await fetchPage(buildUrl());
  }, [target, demoMode, fetchPage, buildUrl]);

  const fetchMore = useCallback(async () => {
    if (!nextLink) return;
    await fetchPage(buildUrl(nextLink), true);
  }, [nextLink, fetchPage, buildUrl]);

  useEffect(() => { void refetch(); }, [refetch]);

  return {
    transactions,
    loading,
    error,
    hasMore: !!nextLink,
    fetchMore,
    refetch,
  };
}

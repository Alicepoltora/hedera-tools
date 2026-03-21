import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface AccountInfo {
  accountId: string;
  evmAddress: string | null;
  balance: number; // HBAR
  stakedNodeId: number | null;
  pendingReward: number; // HBAR
  createdTimestamp: string;
  tokens: Array<{ tokenId: string; balance: number }>;
  memo: string;
}

export interface UseAccountInfoResult {
  info: AccountInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_INFO: AccountInfo = {
  accountId: '0.0.1234567',
  evmAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  balance: 1234.56,
  stakedNodeId: 3,
  pendingReward: 0.42,
  createdTimestamp: '2024-01-15T10:00:00Z',
  tokens: [
    { tokenId: '0.0.1111111', balance: 100000 },
    { tokenId: '0.0.2222222', balance: 5000 },
  ],
  memo: '',
};

/**
 * Fetch full account information from the Mirror Node.
 * Defaults to the connected wallet account.
 *
 * @example
 * const { info } = useAccountInfo();
 * console.log(info?.evmAddress);
 */
export function useAccountInfo(accountId?: string): UseAccountInfoResult {
  const { accountId: connectedId, demoMode, network } = useHedera();
  const targetAccount = accountId ?? connectedId;

  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!targetAccount) return;

    if (demoMode) {
      setInfo({ ...DEMO_INFO, accountId: targetAccount });
      return;
    }

    setLoading(true);
    setError(null);

    const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

    try {
      const [accRes, tokensRes] = await Promise.all([
        fetch(`${mirror}/api/v1/accounts/${targetAccount}`),
        fetch(`${mirror}/api/v1/accounts/${targetAccount}/tokens?limit=100`),
      ]);

      if (!accRes.ok) throw new Error(`Account not found: ${targetAccount}`);

      const acc = await accRes.json();
      const tokensData = await tokensRes.json();

      setInfo({
        accountId: acc.account,
        evmAddress: acc.evm_address ?? null,
        balance: (acc.balance?.balance ?? 0) / 1e8,
        stakedNodeId: acc.staked_node_id ?? null,
        pendingReward: (acc.pending_reward ?? 0) / 1e8,
        createdTimestamp: acc.created_timestamp ?? '',
        tokens: (tokensData.tokens ?? []).map((t: { token_id: string; balance: number }) => ({
          tokenId: t.token_id,
          balance: t.balance,
        })),
        memo: acc.memo ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account info');
    } finally {
      setLoading(false);
    }
  }, [targetAccount, demoMode, network]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { info, loading, error, refetch };
}

import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface TokenBalance {
  tokenId: string;
  balance: number;
  decimals: number;
  name: string;
  symbol: string;
  /** Human-readable balance (balance / 10^decimals) */
  formatted: number;
}

export interface UseTokenBalanceResult {
  balance: TokenBalance | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_BALANCE: TokenBalance = {
  tokenId: '0.0.1234567',
  balance: 100000,
  decimals: 2,
  name: 'Carbon Credit',
  symbol: 'CCR',
  formatted: 1000.0,
};

/**
 * Get the balance of a specific HTS token for an account.
 * Falls back to the connected wallet account if no accountId is given.
 *
 * @example
 * const { balance } = useTokenBalance('0.0.1234567');
 * console.log(balance?.formatted); // 1000.00
 */
export function useTokenBalance(
  tokenId: string,
  accountId?: string
): UseTokenBalanceResult {
  const { accountId: connectedId, demoMode, network } = useHedera();
  const targetAccount = accountId ?? connectedId;

  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!targetAccount || !tokenId) return;

    if (demoMode) {
      setBalance(DEMO_BALANCE);
      return;
    }

    setLoading(true);
    setError(null);

    const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

    try {
      // Fetch token info and balance in parallel
      const [tokenRes, balanceRes] = await Promise.all([
        fetch(`${mirror}/api/v1/tokens/${tokenId}`),
        fetch(`${mirror}/api/v1/accounts/${targetAccount}/tokens?token.id=${tokenId}`),
      ]);

      if (!tokenRes.ok) throw new Error(`Token not found: ${tokenId}`);

      const tokenData = await tokenRes.json();
      const balanceData = await balanceRes.json();

      const decimals: number = Number(tokenData.decimals ?? 0);
      const rawBalance: number = balanceData.tokens?.[0]?.balance ?? 0;

      setBalance({
        tokenId,
        balance: rawBalance,
        decimals,
        name: tokenData.name ?? '',
        symbol: tokenData.symbol ?? '',
        formatted: rawBalance / Math.pow(10, decimals),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token balance');
    } finally {
      setLoading(false);
    }
  }, [tokenId, targetAccount, demoMode, network]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { balance, loading, error, refetch };
}

import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface ExchangeRate {
  /** HBAR price in USD cents */
  centEquiv: number;
  /** HBAR unit count that corresponds to centEquiv */
  hbarEquiv: number;
  /** Computed USD price per 1 HBAR */
  usdPerHbar: number;
  /** Expiration timestamp of this rate */
  expirationTime: number;
  nextRate: {
    centEquiv: number;
    hbarEquiv: number;
    usdPerHbar: number;
    expirationTime: number;
  } | null;
}

export interface UseExchangeRateResult {
  rate: ExchangeRate | null;
  loading: boolean;
  error: string | null;
  /** Convert HBAR amount to USD */
  toUSD: (hbar: number) => number;
  /** Convert USD amount to HBAR */
  toHBAR: (usd: number) => number;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_RATE: ExchangeRate = {
  centEquiv: 12,
  hbarEquiv: 30000,
  usdPerHbar: 0.12 / 30,
  expirationTime: Math.floor(Date.now() / 1000) + 3600,
  nextRate: {
    centEquiv: 12,
    hbarEquiv: 30000,
    usdPerHbar: 0.12 / 30,
    expirationTime: Math.floor(Date.now() / 1000) + 7200,
  },
};

/**
 * Hook for fetching the current HBAR/USD exchange rate from the Mirror Node.
 * Provides `toUSD()` and `toHBAR()` conversion helpers.
 *
 * @example
 * const { rate, toUSD } = useExchangeRate();
 * const usdValue = toUSD(1000); // convert 1000 HBAR to USD
 */
export function useExchangeRate(): UseExchangeRateResult {
  const { demoMode, network } = useHedera();
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const refetch = useCallback(async () => {
    if (demoMode) {
      setRate(DEMO_RATE);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${mirror}/api/v1/network/exchangerate`);
      if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`);
      const data = await res.json();

      const curr = data.current_rate;
      const next = data.next_rate;

      const parseRate = (r: Record<string, number>) => ({
        centEquiv: r.cent_equiv,
        hbarEquiv: r.hbar_equiv,
        usdPerHbar: r.cent_equiv / r.hbar_equiv / 100,
        expirationTime: r.expiration_time,
      });

      setRate({
        ...parseRate(curr),
        nextRate: next ? parseRate(next) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange rate');
    } finally {
      setLoading(false);
    }
  }, [demoMode, mirror]);

  useEffect(() => { void refetch(); }, [refetch]);

  const toUSD = useCallback(
    (hbar: number) => (rate ? hbar * rate.usdPerHbar : 0),
    [rate]
  );

  const toHBAR = useCallback(
    (usd: number) => (rate && rate.usdPerHbar > 0 ? usd / rate.usdPerHbar : 0),
    [rate]
  );

  return { rate, loading, error, toUSD, toHBAR, refetch };
}

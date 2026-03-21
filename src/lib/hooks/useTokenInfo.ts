import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  totalSupply: number;
  maxSupply: number;
  circulatingSupply: number;
  decimals: number;
  treasuryAccountId: string;
  memo: string;
  deleted: boolean;
  pauseStatus: 'NOT_APPLICABLE' | 'PAUSED' | 'UNPAUSED';
  supplyType: 'FINITE' | 'INFINITE';
  createdTimestamp: string;
  expiryTimestamp: string | null;
  adminKey: string | null;
  supplyKey: string | null;
  freezeKey: string | null;
  kycKey: string | null;
  wipeKey: string | null;
}

export interface UseTokenInfoResult {
  info: TokenInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_INFO: TokenInfo = {
  tokenId: '0.0.1234567',
  name: 'Carbon Credit Token',
  symbol: 'CCR',
  type: 'FUNGIBLE_COMMON',
  totalSupply: 1_000_000,
  maxSupply: 10_000_000,
  circulatingSupply: 850_000,
  decimals: 2,
  treasuryAccountId: '0.0.9999999',
  memo: 'Verified carbon credit on Hedera',
  deleted: false,
  pauseStatus: 'UNPAUSED',
  supplyType: 'FINITE',
  createdTimestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
  expiryTimestamp: null,
  adminKey: '0x302a300506032b6570...',
  supplyKey: '0x302a300506032b6570...',
  freezeKey: null,
  kycKey: null,
  wipeKey: null,
};

/**
 * Fetches full metadata for a given HTS token from the Mirror Node.
 *
 * @example
 * const { info, loading } = useTokenInfo('0.0.1234567');
 * console.log(info?.name, info?.totalSupply);
 */
export function useTokenInfo(tokenId: string): UseTokenInfoResult {
  const { demoMode, network } = useHedera();
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const refetch = useCallback(async () => {
    if (!tokenId) return;

    if (demoMode) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 300));
      setInfo({ ...DEMO_INFO, tokenId });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${mirror}/api/v1/tokens/${tokenId}`);
      if (!res.ok) throw new Error(`Token not found: ${tokenId}`);
      const d = await res.json();

      const decimals = Number(d.decimals ?? 0);
      const divisor = Math.pow(10, decimals);

      setInfo({
        tokenId: d.token_id,
        name: d.name,
        symbol: d.symbol,
        type: d.type,
        totalSupply: Number(d.total_supply ?? 0) / divisor,
        maxSupply: Number(d.max_supply ?? 0) / divisor,
        circulatingSupply: Number(d.total_supply ?? 0) / divisor,
        decimals,
        treasuryAccountId: d.treasury_account_id ?? '',
        memo: d.memo ?? '',
        deleted: d.deleted ?? false,
        pauseStatus: d.pause_status ?? 'NOT_APPLICABLE',
        supplyType: d.supply_type ?? 'INFINITE',
        createdTimestamp: d.created_timestamp ?? '',
        expiryTimestamp: d.expiry_timestamp ?? null,
        adminKey: d.admin_key?.key ?? null,
        supplyKey: d.supply_key?.key ?? null,
        freezeKey: d.freeze_key?.key ?? null,
        kycKey: d.kyc_key?.key ?? null,
        wipeKey: d.wipe_key?.key ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
    } finally {
      setLoading(false);
    }
  }, [tokenId, demoMode, mirror]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { info, loading, error, refetch };
}

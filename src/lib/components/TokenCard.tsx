import { useEffect, useState } from 'react';
import { useHedera } from '../hooks/useHedera';

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  totalSupply: number;
  maxSupply: number;
  decimals: number;
  treasuryAccountId: string;
  memo: string;
  deleted: boolean;
}

export interface TokenCardProps {
  tokenId: string;
  /** Show raw token ID */
  showId?: boolean;
  className?: string;
  onClick?: (info: TokenInfo) => void;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_TOKEN: TokenInfo = {
  tokenId: '0.0.1234567',
  name: 'Carbon Credit',
  symbol: 'CCR',
  type: 'FUNGIBLE_COMMON',
  totalSupply: 1_000_000,
  maxSupply: 10_000_000,
  decimals: 2,
  treasuryAccountId: '0.0.9999999',
  memo: 'hedera-ui-kit demo token',
  deleted: false,
};

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-700 rounded ${className}`} />;
}

/**
 * Card component showing HTS token metadata fetched from the Mirror Node.
 *
 * @example
 * <TokenCard tokenId="0.0.1234567" showId />
 */
export function TokenCard({ tokenId, showId = false, className = '', onClick }: TokenCardProps) {
  const { demoMode, network } = useHedera();

  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId) return;

    if (demoMode) {
      setTimeout(() => { setInfo({ ...DEMO_TOKEN, tokenId }); setLoading(false); }, 400);
      return;
    }

    const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

    fetch(`${mirror}/api/v1/tokens/${tokenId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Token not found: ${tokenId}`);
        return r.json();
      })
      .then((d) => {
        setInfo({
          tokenId: d.token_id,
          name: d.name,
          symbol: d.symbol,
          type: d.type,
          totalSupply: Number(d.total_supply ?? 0) / Math.pow(10, Number(d.decimals ?? 0)),
          maxSupply: Number(d.max_supply ?? 0) / Math.pow(10, Number(d.decimals ?? 0)),
          decimals: Number(d.decimals ?? 0),
          treasuryAccountId: d.treasury_account_id ?? '',
          memo: d.memo ?? '',
          deleted: d.deleted ?? false,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tokenId, demoMode, network]);

  const isFungible = info?.type === 'FUNGIBLE_COMMON';

  return (
    <div
      className={`
        rounded-2xl bg-slate-900 border border-slate-800 p-5
        ${onClick ? 'cursor-pointer hover:border-violet-600/50 transition-colors' : ''}
        ${className}
      `}
      onClick={() => info && onClick?.(info)}
    >
      {loading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <SkeletonBlock className="w-28 h-4" />
              <SkeletonBlock className="w-14 h-3" />
            </div>
          </div>
          <SkeletonBlock className="w-full h-3" />
          <SkeletonBlock className="w-2/3 h-3" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      ) : info ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
                <span className="text-violet-300 font-bold text-sm">
                  {info.symbol.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white">{info.name}</p>
                <p className="text-xs text-slate-400">{info.symbol}</p>
              </div>
            </div>
            <span className={`
              text-xs px-2 py-1 rounded-full border font-medium
              ${isFungible
                ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-400'
                : 'bg-violet-950/40 border-violet-700/40 text-violet-400'}
            `}>
              {isFungible ? 'Fungible' : 'NFT'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Total Supply</p>
              <p className="text-sm font-mono text-slate-200">
                {info.totalSupply.toLocaleString()}
              </p>
            </div>
            {info.maxSupply > 0 && (
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Max Supply</p>
                <p className="text-sm font-mono text-slate-200">
                  {info.maxSupply.toLocaleString()}
                </p>
              </div>
            )}
            {isFungible && (
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Decimals</p>
                <p className="text-sm font-mono text-slate-200">{info.decimals}</p>
              </div>
            )}
            <div className="bg-slate-800/60 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Treasury</p>
              <p className="text-sm font-mono text-slate-200 truncate">{info.treasuryAccountId}</p>
            </div>
          </div>

          {info.memo && (
            <p className="mt-3 text-xs text-slate-500 italic">{info.memo}</p>
          )}

          {showId && (
            <p className="mt-2 text-xs font-mono text-slate-600">{info.tokenId}</p>
          )}

          {info.deleted && (
            <div className="mt-3 text-xs bg-red-950/30 text-red-400 border border-red-800/30 rounded px-2 py-1">
              ⚠️ This token has been deleted
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

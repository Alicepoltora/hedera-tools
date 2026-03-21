import { useEffect, useState } from 'react';
import { useNFT, type NFTMetadata } from '../hooks/useNFT';

export interface NFTGalleryProps {
  /** Show NFTs for this account — defaults to connected wallet */
  accountId?: string;
  /** Maximum columns in the grid */
  columns?: 2 | 3 | 4;
  /** Called when an NFT card is clicked */
  onSelect?: (nft: NFTMetadata) => void;
  className?: string;
}

interface NFTCardItemProps {
  nft: NFTMetadata;
  onSelect?: (nft: NFTMetadata) => void;
}

interface NFTJsonMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type?: string; value?: string | number }>;
}

function NFTCardItem({ nft, onSelect }: NFTCardItemProps) {
  const [meta, setMeta] = useState<NFTJsonMetadata | null>(null);
  const [imgError, setImgError] = useState(false);

  // Try to parse metadata as JSON (might be an IPFS URL or raw JSON)
  useEffect(() => {
    if (!nft.metadataDecoded) return;
    try {
      const parsed = JSON.parse(nft.metadataDecoded) as NFTJsonMetadata;
      setMeta(parsed);
    } catch {
      // metadataDecoded is a plain string / URL — not JSON
      if (nft.metadataDecoded.startsWith('ipfs://') || nft.metadataDecoded.startsWith('http')) {
        setMeta({ image: nft.metadataDecoded });
      }
    }
  }, [nft.metadataDecoded]);

  const imageUrl = meta?.image
    ? meta.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : null;

  return (
    <div
      className={`
        rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden
        ${onSelect ? 'cursor-pointer hover:border-violet-500/50 hover:bg-slate-800 transition-all' : ''}
      `}
      onClick={() => onSelect?.(nft)}
    >
      {/* Image / Placeholder */}
      <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={meta?.name ?? `NFT #${nft.serialNumber}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">#{nft.serialNumber}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-sm font-medium text-white truncate">
          {meta?.name ?? `#${nft.serialNumber}`}
        </p>
        <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{nft.tokenId}</p>
        {meta?.attributes && meta.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {meta.attributes.slice(0, 3).map((attr, i) => (
              <span
                key={i}
                className="text-[10px] bg-violet-950/40 text-violet-300 border border-violet-800/30 rounded px-1.5 py-0.5"
              >
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/**
 * Gallery grid of NFTs owned by the connected account (or a specified one).
 * Automatically loads metadata and images from IPFS when available.
 *
 * @example
 * <NFTGallery columns={3} onSelect={(nft) => console.log(nft)} />
 */
export function NFTGallery({ accountId, columns = 3, onSelect, className = '' }: NFTGalleryProps) {
  const { accountNFTs, loading, error, fetchAccountNFTs } = useNFT();

  useEffect(() => {
    void fetchAccountNFTs(accountId);
  }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">NFT Collection</h3>
          {!loading && (
            <p className="text-xs text-slate-500 mt-0.5">
              {accountNFTs.length} item{accountNFTs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => void fetchAccountNFTs(accountId)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh NFTs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className={`grid ${COLS_CLASS[columns]} gap-3`}>
          {Array.from({ length: columns * 2 }, (_, i) => (
            <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
              <div className="aspect-square bg-slate-700 animate-pulse" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-4 bg-slate-700 rounded animate-pulse" />
                <div className="h-3 bg-slate-700 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-950/20 border border-red-800/30 p-4 text-center">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      ) : accountNFTs.length === 0 ? (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center">
          <svg className="w-10 h-10 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 text-sm">No NFTs found</p>
        </div>
      ) : (
        <div className={`grid ${COLS_CLASS[columns]} gap-3`}>
          {accountNFTs.map((nft) => (
            <NFTCardItem
              key={`${nft.tokenId}-${nft.serialNumber}`}
              nft={nft}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

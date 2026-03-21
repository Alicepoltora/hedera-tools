import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface NFTMetadata {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  createdTimestamp: string;
  metadata: string; // base64-encoded metadata
  metadataDecoded: string; // UTF-8 decoded
}

export interface NFTCollection {
  tokenId: string;
  name: string;
  symbol: string;
  totalSupply: number;
  nfts: NFTMetadata[];
}

export interface UseNFTResult {
  nft: NFTMetadata | null;
  collection: NFTCollection | null;
  accountNFTs: NFTMetadata[];
  loading: boolean;
  error: string | null;
  fetchNFT: (tokenId: string, serialNumber: number) => Promise<void>;
  fetchCollection: (tokenId: string) => Promise<void>;
  fetchAccountNFTs: (accountId?: string) => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_NFTS: NFTMetadata[] = [
  {
    tokenId: '0.0.9876543',
    serialNumber: 1,
    accountId: '0.0.1234567',
    createdTimestamp: new Date(Date.now() - 86400000).toISOString(),
    metadata: btoa('ipfs://Qm...'),
    metadataDecoded: 'ipfs://QmDemo1',
  },
  {
    tokenId: '0.0.9876543',
    serialNumber: 2,
    accountId: '0.0.1234567',
    createdTimestamp: new Date(Date.now() - 172800000).toISOString(),
    metadata: btoa('ipfs://Qm...'),
    metadataDecoded: 'ipfs://QmDemo2',
  },
];

/**
 * Hook for working with Hedera NFTs (HTS Non-Fungible Tokens).
 * Fetch individual NFTs, collections, or all NFTs owned by an account.
 *
 * @example
 * const { accountNFTs, fetchAccountNFTs } = useNFT();
 * await fetchAccountNFTs();
 */
export function useNFT(): UseNFTResult {
  const { accountId: connectedId, demoMode, network } = useHedera();

  const [nft, setNFT] = useState<NFTMetadata | null>(null);
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [accountNFTs, setAccountNFTs] = useState<NFTMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const parseNFT = (raw: Record<string, unknown>): NFTMetadata => {
    const metadata = (raw.metadata as string) ?? '';
    let metadataDecoded = '';
    try {
      metadataDecoded = atob(metadata);
    } catch {
      metadataDecoded = metadata;
    }
    return {
      tokenId: raw.token_id as string,
      serialNumber: raw.serial_number as number,
      accountId: raw.account_id as string,
      createdTimestamp: raw.created_timestamp as string,
      metadata,
      metadataDecoded,
    };
  };

  const fetchNFT = useCallback(async (tokenId: string, serialNumber: number) => {
    if (demoMode) { setNFT(DEMO_NFTS[0]); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${mirror}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`);
      if (!res.ok) throw new Error(`NFT not found: ${tokenId}#${serialNumber}`);
      setNFT(parseNFT(await res.json()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT');
    } finally { setLoading(false); }
  }, [demoMode, mirror]);

  const fetchCollection = useCallback(async (tokenId: string) => {
    if (demoMode) {
      setCollection({ tokenId, name: 'Demo Collection', symbol: 'DEMO', totalSupply: 2, nfts: DEMO_NFTS });
      return;
    }
    setLoading(true); setError(null);
    try {
      const [tokenRes, nftsRes] = await Promise.all([
        fetch(`${mirror}/api/v1/tokens/${tokenId}`),
        fetch(`${mirror}/api/v1/tokens/${tokenId}/nfts?limit=50`),
      ]);
      if (!tokenRes.ok) throw new Error(`Token not found: ${tokenId}`);
      const token = await tokenRes.json();
      const nftsData = await nftsRes.json();
      setCollection({
        tokenId,
        name: token.name,
        symbol: token.symbol,
        totalSupply: Number(token.total_supply ?? 0),
        nfts: (nftsData.nfts ?? []).map(parseNFT),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collection');
    } finally { setLoading(false); }
  }, [demoMode, mirror]);

  const fetchAccountNFTs = useCallback(async (accountId?: string) => {
    const target = accountId ?? connectedId;
    if (!target) { setError('No account connected'); return; }
    if (demoMode) { setAccountNFTs(DEMO_NFTS); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${mirror}/api/v1/accounts/${target}/nfts?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch NFTs');
      const data = await res.json();
      setAccountNFTs((data.nfts ?? []).map(parseNFT));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally { setLoading(false); }
  }, [demoMode, mirror, connectedId]);

  useEffect(() => { void fetchAccountNFTs(); }, [fetchAccountNFTs]);

  return { nft, collection, accountNFTs, loading, error, fetchNFT, fetchCollection, fetchAccountNFTs };
}

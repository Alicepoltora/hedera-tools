import { useCallback, useState } from 'react';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  PrivateKey,
} from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export type TokenCreateType = 'FUNGIBLE' | 'NFT';

export interface TokenCreateParams {
  name: string;
  symbol: string;
  type: TokenCreateType;
  /** Initial supply for fungible tokens (in whole units) */
  initialSupply?: number;
  decimals?: number;
  maxSupply?: number;
  memo?: string;
}

export interface UseTokenCreateResult {
  tokenId: string | null;
  loading: boolean;
  error: string | null;
  createToken: (params: TokenCreateParams) => Promise<string | null>;
  reset: () => void;
}

const DEMO_DELAY = 1400;

/**
 * Hook for creating new HTS tokens — both Fungible and NFT collections.
 *
 * @example
 * const { createToken, tokenId, loading } = useTokenCreate();
 * await createToken({ name: 'My Token', symbol: 'MTK', type: 'FUNGIBLE', initialSupply: 1000 });
 */
export function useTokenCreate(): UseTokenCreateResult {
  const { signer, accountId, isConnected, demoMode } = useHedera();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTokenId(null);
    setError(null);
  }, []);

  const createToken = useCallback(
    async (params: TokenCreateParams): Promise<string | null> => {
      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        return null;
      }

      setLoading(true);
      setError(null);

      // ── Demo mode ──
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`;
        setTokenId(fakeId);
        setLoading(false);
        return fakeId;
      }

      // ── Real mode ──
      try {
        if (!signer) throw new Error('Wallet signer not available');

        const isNFT = params.type === 'NFT';
        const adminKey = PrivateKey.generateED25519().publicKey;
        const supplyKey = PrivateKey.generateED25519().publicKey;

        const tx = new TokenCreateTransaction()
          .setTokenName(params.name)
          .setTokenSymbol(params.symbol)
          .setTokenType(isNFT ? TokenType.NonFungibleUnique : TokenType.FungibleCommon)
          .setDecimals(isNFT ? 0 : (params.decimals ?? 2))
          .setInitialSupply(isNFT ? 0 : (params.initialSupply ?? 0))
          .setTreasuryAccountId(accountId)
          .setAdminKey(adminKey)
          .setSupplyKey(supplyKey)
          .setSupplyType(params.maxSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
          .setTokenMemo(params.memo ?? '');

        if (params.maxSupply) {
          tx.setMaxSupply(params.maxSupply);
        }

        const frozenTx = await tx.freezeWithSigner(signer);
        const response = await frozenTx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);
        const id = receipt.tokenId?.toString() ?? null;

        setTokenId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token creation failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, accountId, isConnected, demoMode]
  );

  return { tokenId, loading, error, createToken, reset };
}

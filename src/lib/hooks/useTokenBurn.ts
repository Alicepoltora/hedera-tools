import { useCallback, useState } from 'react';
import { TokenBurnTransaction } from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export interface UseTokenBurnResult {
  txId: string | null;
  loading: boolean;
  error: string | null;
  /** Burn fungible tokens. `amount` is in whole units (respects decimals). */
  burnFungible: (tokenId: string, amount: number) => Promise<string | null>;
  /** Burn specific NFT serial numbers. */
  burnNFT: (tokenId: string, serials: number[]) => Promise<string | null>;
  reset: () => void;
}

const DEMO_DELAY = 1200;

/**
 * Hook for burning HTS tokens (both fungible and NFTs).
 *
 * @example
 * const { burnFungible, burnNFT, txId } = useTokenBurn();
 * await burnFungible('0.0.1234567', 100);
 * await burnNFT('0.0.1234567', [1, 2, 3]);
 */
export function useTokenBurn(): UseTokenBurnResult {
  const { signer, isConnected, demoMode } = useHedera();
  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTxId(null);
    setError(null);
  }, []);

  const executeBurn = useCallback(
    async (tokenId: string, amount: number, serials: number[]): Promise<string | null> => {
      if (!isConnected) {
        setError('Wallet not connected');
        return null;
      }

      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
        setTxId(fakeId);
        setLoading(false);
        return fakeId;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');

        const tx = new TokenBurnTransaction().setTokenId(tokenId);

        if (serials.length > 0) {
          tx.setSerials(serials); // number[] is compatible with (number | Long)[]
        } else {
          tx.setAmount(BigInt(amount));
        }

        const frozenTx = await tx.freezeWithSigner(signer);
        const response = await frozenTx.executeWithSigner(signer);
        const id = response.transactionId.toString();
        setTxId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Burn failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, isConnected, demoMode]
  );

  const burnFungible = useCallback(
    (tokenId: string, amount: number) => executeBurn(tokenId, amount, []),
    [executeBurn]
  );

  const burnNFT = useCallback(
    (tokenId: string, serials: number[]) => executeBurn(tokenId, 0, serials),
    [executeBurn]
  );

  return { txId, loading, error, burnFungible, burnNFT, reset };
}

import { useCallback, useState } from 'react';
import {
  TokenBurnTransaction,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
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
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

/**
 * Hook for burning HTS tokens (both fungible and NFTs).
 *
 * @example
 * const { burnFungible, burnNFT, txId } = useTokenBurn();
 * await burnFungible('0.0.1234567', 100);
 * await burnNFT('0.0.1234567', [1, 2, 3]);
 */
export function useTokenBurn(): UseTokenBurnResult {
  const { signer, connector, accountId, isConnected, demoMode } = useHedera();
  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTxId(null);
    setError(null);
  }, []);

  const executeBurn = useCallback(
    async (tokenId: string, amount: number, serials: number[]): Promise<string | null> => {
      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
        setTxId(fakeId);
        setLoading(false);
        return fakeId;
      }

      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const tx = new TokenBurnTransaction()
          .setTokenId(tokenId)
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        if (serials.length > 0) {
          tx.setSerials(serials);
        } else {
          tx.setAmount(BigInt(amount));
        }

        const frozenTx = tx.freeze();
        const id = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

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
    [signer, connector, accountId, isConnected, demoMode]
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

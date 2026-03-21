import { useCallback, useState } from 'react';
import { TokenAssociateTransaction, TokenDissociateTransaction, AccountId } from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export interface UseTokenAssociateResult {
  associate: (tokenIds: string | string[]) => Promise<string | null>;
  dissociate: (tokenIds: string | string[]) => Promise<string | null>;
  loading: boolean;
  error: string | null;
  txId: string | null;
  reset: () => void;
}

const DEMO_DELAY = 1000;

/**
 * Associate or dissociate HTS tokens with the connected account.
 *
 * On Hedera, accounts MUST associate a token before they can receive it.
 * This is a common source of errors — this hook handles it cleanly.
 *
 * @example
 * const { associate } = useTokenAssociate();
 * await associate('0.0.1234567'); // now the account can receive this token
 * await associate(['0.0.111', '0.0.222']); // associate multiple at once
 */
export function useTokenAssociate(): UseTokenAssociateResult {
  const { signer, accountId, isConnected, demoMode } = useHedera();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setTxId(null);
  }, []);

  const runTx = useCallback(
    async (tokenIds: string | string[], type: 'associate' | 'dissociate'): Promise<string | null> => {
      if (!isConnected || !accountId) {
        setError('Wallet not connected.');
        return null;
      }

      setLoading(true);
      setError(null);

      const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fake = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
        setTxId(fake);
        setLoading(false);
        return fake;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');

        const accId = AccountId.fromString(accountId);

        const tx =
          type === 'associate'
            ? new TokenAssociateTransaction()
                .setAccountId(accId)
                .setTokenIds(ids)
            : new TokenDissociateTransaction()
                .setAccountId(accId)
                .setTokenIds(ids);

        const frozenTx = await tx.freezeWithSigner(signer);
        const response = await frozenTx.executeWithSigner(signer);
        const id = response.transactionId.toString();
        setTxId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Token ${type} failed`;
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, accountId, isConnected, demoMode]
  );

  const associate = useCallback(
    (tokenIds: string | string[]) => runTx(tokenIds, 'associate'),
    [runTx]
  );

  const dissociate = useCallback(
    (tokenIds: string | string[]) => runTx(tokenIds, 'dissociate'),
    [runTx]
  );

  return { associate, dissociate, loading, error, txId, reset };
}

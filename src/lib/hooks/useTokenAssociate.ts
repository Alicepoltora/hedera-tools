import { useCallback, useState } from 'react';
import {
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  AccountId,
  TransactionId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
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
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

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
  const { signer, connector, accountId, isConnected, demoMode } = useHedera();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setTxId(null);
  }, []);

  const runTx = useCallback(
    async (tokenIds: string | string[], type: 'associate' | 'dissociate'): Promise<string | null> => {
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

      if (!isConnected || !accountId) {
        setError('Wallet not connected.');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const accId = AccountId.fromString(accountId);
        const nodeIds = NODE_IDS.map((id) => AccountId.fromString(id));
        const generatedTxId = TransactionId.generate(accId);

        const tx =
          type === 'associate'
            ? new TokenAssociateTransaction()
                .setAccountId(accId)
                .setTokenIds(ids)
                .setTransactionId(generatedTxId)
                .setNodeAccountIds(nodeIds)
            : new TokenDissociateTransaction()
                .setAccountId(accId)
                .setTokenIds(ids)
                .setTransactionId(generatedTxId)
                .setNodeAccountIds(nodeIds);

        const frozenTx = tx.freeze();
        const id = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

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
    [signer, connector, accountId, isConnected, demoMode]
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

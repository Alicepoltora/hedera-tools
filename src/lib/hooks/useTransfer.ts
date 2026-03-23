import { useCallback, useState } from 'react';
import {
  Hbar,
  HbarUnit,
  TransferTransaction,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { useHedera } from './useHedera';

export interface TransferResult {
  txId: string | null;
  loading: boolean;
  error: string | null;
  transfer: (toAccountId: string, amountHbar: number) => Promise<string | null>;
  reset: () => void;
}

const DEMO_DELAY = 1200;

/**
 * Hook for sending HBAR from the connected wallet to another account.
 *
 * @example
 * const { transfer, loading, error, txId } = useTransfer();
 * await transfer('0.0.9999', 5); // send 5 HBAR
 */
export function useTransfer(): TransferResult {
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setTxId(null);
  }, []);

  const transfer = useCallback(
    async (toAccountId: string, amountHbar: number): Promise<string | null> => {
      setLoading(true);
      setError(null);

      // ── Demo mode — simulate success ──
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
        setTxId(fakeId);
        setLoading(false);
        return fakeId;
      }

      // ── Real mode ──
      if (!isConnected || !accountId) {
        setError('Wallet not connected. Call connect() first.');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        // Nodes 0.0.3–0.0.7 exist on both mainnet & testnet.
        const nodeIds = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

        const tx = new TransferTransaction()
          .addHbarTransfer(accountId, Hbar.from(-amountHbar, HbarUnit.Hbar))
          .addHbarTransfer(toAccountId, Hbar.from(amountHbar, HbarUnit.Hbar))
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(nodeIds.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();

        // Capture txId — we set it manually so we know it before submitting.
        const id = frozenTx.transactionId!.toString();

        // Two-step sign+execute (same as useTokenCreate):
        // 1. signer.signTransaction  — wallet signs body bytes, no field stripping
        // 2. connector.executeTransaction — submits pre-signed bytes as-is
        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        setTxId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transfer failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
  );

  return { transfer, loading, error, txId, reset };
}

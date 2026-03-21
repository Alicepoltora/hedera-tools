import { useCallback, useState } from 'react';
import { AccountId, Hbar, TransferTransaction } from '@hashgraph/sdk';
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
  const { hashconnect, accountId, isConnected, demoMode } = useHedera();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setTxId(null);
  }, []);

  const transfer = useCallback(
    async (toAccountId: string, amountHbar: number): Promise<string | null> => {
      if (!isConnected || !accountId) {
        setError('Wallet not connected. Call connect() first.');
        return null;
      }

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
      try {
        if (!hashconnect) throw new Error('HashConnect not initialised');

        const signer = hashconnect.getSigner(AccountId.fromString(accountId));

        const tx = await new TransferTransaction()
          .addHbarTransfer(accountId, Hbar.from(-amountHbar))
          .addHbarTransfer(toAccountId, Hbar.from(amountHbar))
          .freezeWithSigner(signer);

        const response = await tx.executeWithSigner(signer);
        const id = response.transactionId.toString();
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
    [hashconnect, accountId, isConnected, demoMode]
  );

  return { transfer, loading, error, txId, reset };
}

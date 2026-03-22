import { useCallback, useState } from 'react';
import {
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
  TransferTransaction,
  Hbar,
  HbarUnit,
  AccountId,
} from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export interface ScheduleInfo {
  scheduleId: string;
  memo: string;
  adminKey: string | null;
  payerAccountId: string;
  creatorAccountId: string;
  expirationTime: string;
  executed: boolean;
  deleted: boolean;
  signatories: string[];
}

export interface UseScheduledTransactionResult {
  scheduleId: string | null;
  scheduleInfo: ScheduleInfo | null;
  loading: boolean;
  error: string | null;
  /** Create a scheduled HBAR transfer */
  scheduleTransfer: (
    toAccountId: string,
    amountHbar: number,
    memo?: string
  ) => Promise<string | null>;
  /** Sign an existing scheduled transaction */
  signScheduled: (scheduleId: string) => Promise<string | null>;
  /** Fetch info about a scheduled transaction */
  fetchScheduleInfo: (scheduleId: string) => Promise<void>;
  reset: () => void;
}

const DEMO_DELAY = 1300;

/**
 * Hook for creating and signing Hedera Scheduled Transactions.
 * Useful for multi-sig workflows where multiple parties need to approve.
 *
 * @example
 * const { scheduleTransfer, scheduleId } = useScheduledTransaction();
 * await scheduleTransfer('0.0.9999', 100, 'Team payment Q1');
 */
export function useScheduledTransaction(): UseScheduledTransactionResult {
  const { signer, accountId, isConnected, demoMode } = useHedera();
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setScheduleId(null);
    setScheduleInfo(null);
    setError(null);
  }, []);

  const scheduleTransfer = useCallback(
    async (toAccountId: string, amountHbar: number, memo = ''): Promise<string | null> => {
      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`;
        setScheduleId(fakeId);
        setScheduleInfo({
          scheduleId: fakeId,
          memo,
          adminKey: null,
          payerAccountId: accountId,
          creatorAccountId: accountId,
          expirationTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          executed: false,
          deleted: false,
          signatories: [accountId],
        });
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

        const scheduledTx = new TransferTransaction()
          .addHbarTransfer(accountId, Hbar.from(-amountHbar, HbarUnit.Hbar))
          .addHbarTransfer(toAccountId, Hbar.from(amountHbar, HbarUnit.Hbar));

        const tx = await new ScheduleCreateTransaction()
          .setScheduledTransaction(scheduledTx)
          .setScheduleMemo(memo)
          .setPayerAccountId(AccountId.fromString(accountId))
          .freezeWithSigner(signer);

        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);
        const id = receipt.scheduleId?.toString() ?? null;

        setScheduleId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Schedule creation failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, accountId, isConnected, demoMode]
  );

  const signScheduled = useCallback(
    async (sid: string): Promise<string | null> => {
      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        setLoading(false);
        return `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
      }

      if (!isConnected) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');

        const tx = await new ScheduleSignTransaction()
          .setScheduleId(sid)
          .freezeWithSigner(signer);

        const response = await tx.executeWithSigner(signer);
        return response.transactionId.toString();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, isConnected, demoMode]
  );

  const fetchScheduleInfo = useCallback(
    async (sid: string) => {
      if (demoMode) {
        setScheduleInfo({
          scheduleId: sid,
          memo: 'Demo scheduled tx',
          adminKey: null,
          payerAccountId: accountId ?? '0.0.1234567',
          creatorAccountId: accountId ?? '0.0.1234567',
          expirationTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
          executed: false,
          deleted: false,
          signatories: [accountId ?? '0.0.1234567'],
        });
        return;
      }

      if (!signer) return;

      setLoading(true);
      try {
        const info = await new ScheduleInfoQuery().setScheduleId(sid).executeWithSigner(signer);
        setScheduleInfo({
          scheduleId: sid,
          memo: info.scheduleMemo ?? '',
          adminKey: info.adminKey?.toString() ?? null,
          payerAccountId: info.payerAccountId?.toString() ?? '',
          creatorAccountId: (info as unknown as Record<string, { toString: () => string }>).creatorAccountId?.toString() ?? '',
          expirationTime: info.expirationTime?.toString() ?? '',
          executed: !!info.executed,
          deleted: !!info.deleted,
          signatories: [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule info');
      } finally {
        setLoading(false);
      }
    },
    [signer, demoMode, accountId]
  );

  return {
    scheduleId,
    scheduleInfo,
    loading,
    error,
    scheduleTransfer,
    signScheduled,
    fetchScheduleInfo,
    reset,
  };
}

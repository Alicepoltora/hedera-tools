import { useCallback, useState } from 'react';
import {
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  TransferTransaction,
  Hbar,
  HbarUnit,
  AccountId,
  TransactionId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
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
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

// Convert SDK txId format to Mirror Node format
// '0.0.123@1234567890.123456789' -> '0.0.123-1234567890-123456789'
function toMirrorTxId(txIdStr: string): string {
  return txIdStr.replace('@', '-').replace(/\.(\d+)$/, '-$1');
}

// Poll Mirror Node until transaction succeeds and return entity_id (scheduleId)
async function waitForEntityId(txIdStr: string, mirrorUrl: string): Promise<string | null> {
  const mirrorId = toMirrorTxId(txIdStr);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`${mirrorUrl}/api/v1/transactions/${mirrorId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const txs: Array<{ result: string; entity_id?: string }> = data.transactions ?? [];
      if (txs.length > 0 && txs[0].result === 'SUCCESS') {
        return txs[0].entity_id ?? null;
      }
    } catch {
      // retry
    }
  }
  return null;
}

/**
 * Hook for creating and signing Hedera Scheduled Transactions.
 * Useful for multi-sig workflows where multiple parties need to approve.
 *
 * @example
 * const { scheduleTransfer, scheduleId } = useScheduledTransaction();
 * await scheduleTransfer('0.0.9999', 100, 'Team payment Q1');
 */
export function useScheduledTransaction(): UseScheduledTransactionResult {
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();
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
          payerAccountId: accountId ?? '0.0.0',
          creatorAccountId: accountId ?? '0.0.0',
          expirationTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          executed: false,
          deleted: false,
          signatories: [accountId ?? '0.0.0'],
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
        if (!connector) throw new Error('WalletConnect connector not available');

        const scheduledTx = new TransferTransaction()
          .addHbarTransfer(accountId, Hbar.from(-amountHbar, HbarUnit.Hbar))
          .addHbarTransfer(toAccountId, Hbar.from(amountHbar, HbarUnit.Hbar));

        const tx = new ScheduleCreateTransaction()
          .setScheduledTransaction(scheduledTx)
          .setScheduleMemo(memo)
          .setPayerAccountId(AccountId.fromString(accountId))
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const txIdStr = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        // Poll Mirror Node for the created schedule entity_id
        const mirrorUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
        const sid = await waitForEntityId(txIdStr, mirrorUrl);
        setScheduleId(sid);
        return sid;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Schedule creation failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
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

      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const tx = new ScheduleSignTransaction()
          .setScheduleId(sid)
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const id = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode]
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

      setLoading(true);
      const mirrorUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
      try {
        const res = await fetch(`${mirrorUrl}/api/v1/schedules/${sid}`);
        if (!res.ok) throw new Error(`Schedule not found: ${sid}`);
        const s = await res.json();
        setScheduleInfo({
          scheduleId: sid,
          memo: s.memo ?? '',
          adminKey: s.admin_key?.key ?? null,
          payerAccountId: s.payer_account_id ?? '',
          creatorAccountId: s.creator_account_id ?? '',
          expirationTime: s.expiration_time ?? '',
          executed: !!s.executed_timestamp,
          deleted: !!s.deleted,
          signatories: (s.signatories ?? []).map((sig: { public_key_prefix: string }) => sig.public_key_prefix),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule info');
      } finally {
        setLoading(false);
      }
    },
    [demoMode, network, accountId]
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

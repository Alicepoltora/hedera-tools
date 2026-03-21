import { useCallback, useEffect, useState } from 'react';
import { useHedera } from '../hooks/useHedera';

type TxState = 'pending' | 'confirmed' | 'failed' | 'unknown';

export interface TransactionRecord {
  txId: string;
  state: TxState;
  consensusTimestamp: string | null;
  result: string | null;
  chargedFee: number | null; // HBAR
  hashScanUrl: string;
}

export interface TransactionStatusProps {
  /** Transaction ID — e.g. "0.0.12345@1710000000.000000000" */
  txId: string | null;
  /** Poll until confirmed. Default: true */
  poll?: boolean;
  /** Polling interval in ms. Default: 3000 */
  pollInterval?: number;
  className?: string;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const HASHSCAN: Record<string, string> = {
  testnet: 'https://hashscan.io/testnet/transaction',
  mainnet: 'https://hashscan.io/mainnet/transaction',
  previewnet: 'https://hashscan.io/previewnet/transaction',
};

const STATE_CONFIG: Record<TxState, { label: string; icon: string; classes: string }> = {
  pending:   { label: 'Pending',   icon: '⏳', classes: 'bg-amber-950/40 border-amber-700/40 text-amber-300' },
  confirmed: { label: 'Confirmed', icon: '✅', classes: 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' },
  failed:    { label: 'Failed',    icon: '❌', classes: 'bg-red-950/40 border-red-700/40 text-red-300' },
  unknown:   { label: 'Unknown',   icon: '❓', classes: 'bg-slate-800 border-slate-700 text-slate-400' },
};

/**
 * Displays live status of a Hedera transaction with Mirror Node polling.
 * Shows state, fee, timestamp, and a HashScan link.
 *
 * @example
 * <TransactionStatus txId="0.0.12345@1710000000.000000000" />
 */
export function TransactionStatus({
  txId,
  poll = true,
  pollInterval = 3000,
  className = '',
}: TransactionStatusProps) {
  const { demoMode, network } = useHedera();

  const [record, setRecord] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
  const hashscan = HASHSCAN[network] ?? HASHSCAN.testnet;

  const fetchStatus = useCallback(async () => {
    if (!txId) return;

    if (demoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setRecord({
        txId,
        state: 'confirmed',
        consensusTimestamp: new Date().toISOString(),
        result: 'SUCCESS',
        chargedFee: 0.0001,
        hashScanUrl: `${hashscan}/${txId}`,
      });
      return;
    }

    setLoading(true);

    try {
      // Mirror Node expects the txId in format 0.0.12345-1710000000-000000000
      const normalised = txId.replace('@', '-').replace('.', '-').replace('.', '-');
      const res = await fetch(`${mirror}/api/v1/transactions/${normalised}`);

      if (res.status === 404) {
        setRecord({ txId, state: 'pending', consensusTimestamp: null, result: null, chargedFee: null, hashScanUrl: `${hashscan}/${txId}` });
        return;
      }

      if (!res.ok) throw new Error(`Mirror Node ${res.status}`);

      const data = await res.json();
      const tx = data.transactions?.[0];

      if (!tx) {
        setRecord({ txId, state: 'pending', consensusTimestamp: null, result: null, chargedFee: null, hashScanUrl: `${hashscan}/${txId}` });
        return;
      }

      const result: string = tx.result ?? 'UNKNOWN';
      const state: TxState = result === 'SUCCESS' ? 'confirmed' : result === 'UNKNOWN' ? 'pending' : 'failed';

      setRecord({
        txId,
        state,
        consensusTimestamp: tx.consensus_timestamp ?? null,
        result,
        chargedFee: tx.charged_tx_fee ? tx.charged_tx_fee / 1e8 : null,
        hashScanUrl: `${hashscan}/${txId}`,
      });
    } catch {
      setRecord({ txId, state: 'unknown', consensusTimestamp: null, result: null, chargedFee: null, hashScanUrl: `${hashscan}/${txId}` });
    } finally {
      setLoading(false);
    }
  }, [txId, demoMode, mirror, hashscan]);

  useEffect(() => {
    if (!txId) return;
    void fetchStatus();
  }, [txId, fetchStatus]);

  // Stop polling once confirmed or failed
  useEffect(() => {
    if (!poll || !txId) return;
    if (record?.state === 'confirmed' || record?.state === 'failed') return;

    const id = setInterval(() => void fetchStatus(), pollInterval);
    return () => clearInterval(id);
  }, [poll, txId, record?.state, pollInterval, fetchStatus]);

  if (!txId) return null;

  const state = record?.state ?? 'pending';
  const cfg = STATE_CONFIG[state];

  return (
    <div className={`rounded-xl border p-3.5 ${cfg.classes} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <div>
            <p className="text-sm font-semibold">{cfg.label}</p>
            {record?.result && record.result !== 'SUCCESS' && (
              <p className="text-xs opacity-70 mt-0.5">{record.result}</p>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col gap-0.5">
          {record?.chargedFee != null && (
            <span className="text-xs opacity-70">Fee: {record.chargedFee.toFixed(6)} ℏ</span>
          )}
          {loading && (
            <span className="text-xs opacity-50">
              <svg className="inline animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              checking…
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs opacity-50 font-mono truncate">{txId}</p>
        <a
          href={record?.hashScanUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs opacity-70 hover:opacity-100 underline whitespace-nowrap transition-opacity"
        >
          HashScan ↗
        </a>
      </div>
    </div>
  );
}

import { useAccountTransactions, type AccountTransaction } from '../hooks/useAccountTransactions';

export interface TransactionHistoryProps {
  /** Show transactions for this account — defaults to connected wallet */
  accountId?: string;
  /** Number of transactions to fetch per page */
  limit?: number;
  /** Show token transfer column */
  showTokenTransfers?: boolean;
  /** Show fee column */
  showFees?: boolean;
  className?: string;
}

const TX_TYPE_LABELS: Record<string, string> = {
  CRYPTOTRANSFER: 'Transfer',
  TOKENMINT: 'Mint',
  TOKENBURN: 'Burn',
  TOKENCREATION: 'Create Token',
  TOKENASSOCIATE: 'Associate',
  TOKENDISSOCIATE: 'Dissociate',
  CONTRACTCALL: 'Contract Call',
  CONTRACTCREATEINSTANCE: 'Deploy Contract',
  SCHEDULECREATE: 'Schedule Create',
  SCHEDULESIGN: 'Schedule Sign',
  SCHEDULEEXECUTE: 'Schedule Execute',
  CRYPTOCREATEACCOUNT: 'Create Account',
  CRYPTODELETE: 'Delete Account',
  FILECREATE: 'File Create',
  FILEAPPEND: 'File Append',
  CONSENSUSSUBMITMESSAGE: 'HCS Message',
  CONSENSUSCREATETOPIC: 'Create Topic',
};

function TxTypeBadge({ type }: { type: string }) {
  const label = TX_TYPE_LABELS[type] ?? type;
  const isToken = type.startsWith('TOKEN');
  const isContract = type.startsWith('CONTRACT');
  const isHCS = type.startsWith('CONSENSUS');

  const colorClass = isToken
    ? 'bg-violet-950/40 text-violet-300 border-violet-800/30'
    : isContract
    ? 'bg-blue-950/40 text-blue-300 border-blue-800/30'
    : isHCS
    ? 'bg-teal-950/40 text-teal-300 border-teal-800/30'
    : 'bg-slate-800 text-slate-300 border-slate-700/50';

  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap ${colorClass}`}>
      {label}
    </span>
  );
}

function HbarDelta({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-slate-500 font-mono text-sm">—</span>;
  const positive = amount > 0;
  return (
    <span
      className={`font-mono text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {positive ? '+' : ''}
      {amount.toFixed(4)} ℏ
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const ok = result === 'SUCCESS';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {ok ? 'OK' : result}
    </span>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(Number(ts.split('.')[0]) * 1000);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TxRow({
  tx,
  showFees,
}: {
  tx: AccountTransaction;
  showFees: boolean;
}) {
  return (
    <tr className="border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td className="py-3 px-4">
        <TxTypeBadge type={tx.type} />
      </td>
      <td className="py-3 px-4">
        <ResultBadge result={tx.result} />
      </td>
      <td className="py-3 px-4 text-right">
        <HbarDelta amount={tx.hbarDelta} />
      </td>
      {showFees && (
        <td className="py-3 px-4 text-right text-xs text-slate-600 font-mono">
          {tx.charged_tx_fee.toFixed(4)} ℏ
        </td>
      )}
      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
        {formatTimestamp(tx.consensusTimestamp)}
      </td>
      <td className="py-3 px-4">
        <a
          href={tx.hashscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 transition-colors"
          title="View on HashScan"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </td>
    </tr>
  );
}

/**
 * Table of recent transactions for the connected account (or a specified one).
 * Links to HashScan for each transaction.
 *
 * @example
 * <TransactionHistory showFees />
 */
export function TransactionHistory({
  accountId,
  limit = 25,
  showFees = false,
  className = '',
}: TransactionHistoryProps) {
  const { transactions, loading, error, hasMore, fetchMore, refetch } =
    useAccountTransactions(accountId, { limit });

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Transaction History</h3>
          {!loading && transactions.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">{transactions.length} transactions</p>
          )}
        </div>
        <button
          onClick={() => void refetch()}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-950/20 border border-red-800/30 p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-400">Type</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-400">Status</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-400">Amount</th>
                  {showFees && (
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-400">Fee</th>
                  )}
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-400">Time</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} className="border-t border-slate-800/60">
                      {[...Array(showFees ? 6 : 5)].map((__, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showFees ? 6 : 5}
                      className="py-10 text-center text-slate-500 text-sm"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <TxRow key={tx.transactionId} tx={tx} showFees={showFees} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="p-3 border-t border-slate-800 text-center">
              <button
                onClick={() => void fetchMore()}
                disabled={loading}
                className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

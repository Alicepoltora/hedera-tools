import { useExchangeRate } from '../hooks/useExchangeRate';

export interface HBARPriceWidgetProps {
  /** Show next rate alongside current rate */
  showNextRate?: boolean;
  /** Compact inline mode — just the price */
  compact?: boolean;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Displays the current HBAR/USD exchange rate fetched from the Mirror Node.
 *
 * @example
 * <HBARPriceWidget />
 * <HBARPriceWidget compact />
 */
export function HBARPriceWidget({
  showNextRate = false,
  compact = false,
  className = '',
}: HBARPriceWidgetProps) {
  const { rate, loading, error, refetch } = useExchangeRate();

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-mono ${className}`}>
        <span className="text-slate-400">1 ℏ =</span>
        {loading ? (
          <span className="animate-pulse bg-slate-700 rounded w-12 h-4 inline-block" />
        ) : rate ? (
          <span className="text-emerald-400 font-semibold">
            ${rate.usdPerHbar.toFixed(6)}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-slate-900 border border-slate-800 p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <span className="text-violet-400 font-bold text-sm">ℏ</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">HBAR</p>
            <p className="text-xs text-slate-500">Exchange Rate</p>
          </div>
        </div>
        <button
          onClick={() => void refetch()}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh rate"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="bg-slate-700 rounded h-8 w-32" />
          <div className="bg-slate-700 rounded h-4 w-24" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      ) : rate ? (
        <>
          {/* Current rate */}
          <div className="mb-3">
            <p className="text-3xl font-bold font-mono text-white">
              ${rate.usdPerHbar.toFixed(6)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">per 1 HBAR</p>
          </div>

          {/* Rate details */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-800/60 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">HBAR Equiv</p>
              <p className="text-sm font-mono text-slate-200">{(rate.hbarEquiv ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Cent Equiv</p>
              <p className="text-sm font-mono text-slate-200">{rate.centEquiv ?? 0}¢</p>
            </div>
          </div>

          {/* Next rate */}
          {showNextRate && rate.nextRate && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-1.5">Next Rate</p>
              <p className="text-lg font-mono text-slate-400">
                ${rate.nextRate.usdPerHbar.toFixed(6)}
              </p>
            </div>
          )}

          {/* Expiry */}
          <p className="text-xs text-slate-600 mt-3">
            Expires{' '}
            {new Date(rate.expirationTime * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </>
      ) : null}
    </div>
  );
}

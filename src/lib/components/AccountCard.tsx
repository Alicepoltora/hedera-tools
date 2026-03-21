import { useState } from 'react';
import { useHedera } from '../hooks/useHedera';
import { useExchangeRate } from '../hooks/useExchangeRate';

export interface AccountCardProps {
  /** Override displayed account ID */
  accountId?: string;
  /** Show USD equivalent */
  showUSD?: boolean;
  /** Show QR code for receiving payments */
  showQR?: boolean;
  /** Show copy-to-clipboard button */
  showCopy?: boolean;
  /** Extra CSS classes */
  className?: string;
  onDisconnect?: () => void;
}

function QRPlaceholder({ value }: { value: string }) {
  // Simple visual QR placeholder — production apps should use a real QR library
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl">
      <div
        className="w-28 h-28 grid"
        style={{ gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}
        title={value}
      >
        {Array.from({ length: 49 }, (_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ background: Math.random() > 0.5 ? '#111827' : '#fff' }}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-500 font-mono break-all text-center max-w-[7rem]">
        {value}
      </p>
    </div>
  );
}

/**
 * Account summary card — shows account ID, HBAR balance, USD value, and optional QR code.
 *
 * @example
 * <AccountCard showUSD showQR />
 */
export function AccountCard({
  accountId: propAccountId,
  showUSD = true,
  showQR = false,
  showCopy = true,
  className = '',
  onDisconnect,
}: AccountCardProps) {
  const { accountId: ctxAccountId, balance, isConnected, disconnect, network, demoMode } =
    useHedera();
  const { toUSD } = useExchangeRate();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const accountId = propAccountId ?? ctxAccountId;

  const handleCopy = async () => {
    if (!accountId) return;
    await navigator.clipboard.writeText(accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDisconnect = () => {
    onDisconnect?.();
    void disconnect();
  };

  if (!isConnected || !accountId) {
    return (
      <div
        className={`rounded-2xl bg-slate-900 border border-slate-800 p-5 text-center ${className}`}
      >
        <p className="text-slate-500 text-sm">No wallet connected</p>
      </div>
    );
  }

  const usdBalance = balance !== null ? toUSD(balance) : null;

  return (
    <div
      className={`rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-wide">
            Connected
          </span>
          {demoMode && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              demo
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 capitalize">{network}</span>
      </div>

      {/* Account ID */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Account ID</p>
          <p className="font-mono text-white text-sm font-semibold truncate">{accountId}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {showCopy && (
            <button
              onClick={() => void handleCopy()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Copy account ID"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
          {showQR && (
            <button
              onClick={() => setQrOpen((o) => !o)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Show QR code"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* QR Code */}
      {qrOpen && showQR && (
        <div className="flex justify-center">
          <QRPlaceholder value={accountId} />
        </div>
      )}

      {/* Balance */}
      {balance !== null && (
        <div className="bg-slate-800/60 rounded-xl p-3.5">
          <p className="text-xs text-slate-500 mb-1">HBAR Balance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white font-mono">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-slate-400 text-sm">ℏ</span>
          </div>
          {showUSD && usdBalance !== null && usdBalance > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              ≈ ${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          )}
        </div>
      )}

      {/* Disconnect */}
      <button
        onClick={handleDisconnect}
        className="w-full py-2 rounded-xl bg-red-950/30 border border-red-800/30 text-red-400 text-sm hover:bg-red-900/40 hover:border-red-600/40 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

import { useHedera, type HederaNetwork } from '../hooks/useHedera';

const NETWORKS: { value: HederaNetwork; label: string; color: string }[] = [
  { value: 'testnet',    label: 'Testnet',    color: 'text-amber-400' },
  { value: 'mainnet',   label: 'Mainnet',    color: 'text-emerald-400' },
  { value: 'previewnet',label: 'Previewnet', color: 'text-blue-400' },
];

export interface NetworkSwitcherProps {
  /** Show as pill-group instead of dropdown. Default: false */
  variant?: 'dropdown' | 'pills';
  className?: string;
}

/**
 * Dropdown or pill-group to switch the active Hedera network.
 * Automatically reconnects the wallet when network changes.
 *
 * @example
 * <NetworkSwitcher variant="pills" />
 */
export function NetworkSwitcher({ variant = 'dropdown', className = '' }: NetworkSwitcherProps) {
  const { network, setNetwork, isConnected } = useHedera();
  const current = NETWORKS.find((n) => n.value === network) ?? NETWORKS[0];

  if (variant === 'pills') {
    return (
      <div className={`inline-flex rounded-xl bg-slate-800 p-1 gap-1 ${className}`}>
        {NETWORKS.map((n) => (
          <button
            key={n.value}
            onClick={() => setNetwork(n.value)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${network === n.value
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            {n.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={network}
        onChange={(e) => setNetwork(e.target.value as HederaNetwork)}
        className={`
          appearance-none pl-3 pr-8 py-2 rounded-xl
          bg-slate-800 border border-slate-700
          text-sm font-medium ${current.color}
          focus:outline-none focus:border-violet-500
          cursor-pointer transition-colors
        `}
      >
        {NETWORKS.map((n) => (
          <option key={n.value} value={n.value}>
            {n.label}
          </option>
        ))}
      </select>
      {/* Chevron icon */}
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      {isConnected && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
      )}
    </div>
  );
}

import { useHedera } from '../hooks/useHedera';

// HashPack logo as inline SVG
const HashPackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#7C3AED" />
    <path
      d="M12 10h4v8h8v-8h4v20h-4v-8h-8v8h-4V10z"
      fill="white"
    />
  </svg>
);

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

export interface ConnectButtonProps {
  /** Override the default "Connect Wallet" label */
  label?: string;
  /** Extra CSS classes */
  className?: string;
  /** Show account balance alongside account ID */
  showBalance?: boolean;
}

/**
 * Plug-and-play button for connecting / disconnecting a HashPack wallet.
 * Requires `<HederaProvider>` in the tree.
 *
 * @example
 * <ConnectButton showBalance />
 */
export function ConnectButton({
  label = 'Connect Wallet',
  className = '',
  showBalance = false,
}: ConnectButtonProps) {
  const { accountId, balance, isConnected, isConnecting, connect, disconnect, demoMode } =
    useHedera();

  const handleClick = () => {
    if (isConnected) void disconnect();
    else void connect();
  };

  // ── Connected state ──
  if (isConnected && accountId) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {showBalance && balance !== null && (
          <span className="text-sm text-emerald-400 font-mono bg-emerald-950/40 px-2 py-1 rounded">
            {balance.toFixed(2)} ℏ
          </span>
        )}
        <button
          onClick={handleClick}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-xl
            bg-violet-600/20 border border-violet-500/40
            text-violet-300 text-sm font-medium
            hover:bg-red-600/20 hover:border-red-500/40 hover:text-red-300
            transition-all duration-200 group
          "
          title="Click to disconnect"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-red-400 transition-colors" />
          <span className="font-mono">
            {accountId.slice(0, 6)}…{accountId.slice(-4)}
          </span>
          {demoMode && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              demo
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Disconnected / connecting state ──
  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={`
        inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl
        bg-violet-600 hover:bg-violet-500 active:bg-violet-700
        text-white font-semibold text-sm
        shadow-lg shadow-violet-600/30
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isConnecting ? (
        <>
          <Spinner />
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <HashPackIcon />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

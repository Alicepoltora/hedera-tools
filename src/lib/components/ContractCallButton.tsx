import { useCallback, useState } from 'react';
import { useContractWrite } from '../hooks/useContractWrite';

export interface ContractCallButtonProps {
  /** Hedera contract ID, e.g. "0.0.1234567" */
  contractId: string;
  /** ABI function name to call */
  functionName: string;
  /** ABI-encoded parameters (optional) */
  params?: Uint8Array;
  /** HBAR to send with the call */
  payableAmount?: number;
  /** Max gas for this call. Default: 100000 */
  gas?: number;
  /** Button label */
  label?: string;
  /** Called on success with the transaction ID */
  onSuccess?: (txId: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Extra CSS classes */
  className?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: `
    bg-violet-600 hover:bg-violet-500 active:bg-violet-700
    text-white shadow-lg shadow-violet-600/20
  `,
  secondary: `
    bg-slate-800 hover:bg-slate-700 border border-slate-700
    text-slate-200
  `,
  danger: `
    bg-red-900/40 hover:bg-red-800/50 border border-red-700/40
    text-red-300
  `,
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/**
 * Button that executes a smart contract function call on Hedera.
 * Shows loading state, result, and error inline.
 *
 * @example
 * <ContractCallButton
 *   contractId="0.0.1234567"
 *   functionName="mint"
 *   label="Mint Token"
 *   onSuccess={(txId) => console.log('Minted:', txId)}
 * />
 */
export function ContractCallButton({
  contractId,
  functionName,
  params,
  payableAmount,
  gas = 100_000,
  label,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  variant = 'primary',
}: ContractCallButtonProps) {
  const { write, loading, error, txId, reset } = useContractWrite();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLocalError(null);
    reset();

    const result = await write({
      contractId,
      functionName,
      encodedParams: params,
      payableAmount,
      gas,
    });

    if (result) {
      onSuccess?.(result);
    } else if (error) {
      setLocalError(error);
      onError?.(error);
    }
  }, [write, contractId, functionName, params, payableAmount, gas, onSuccess, onError, error, reset]);

  const displayLabel = label ?? functionName;
  const displayError = localError ?? error;

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <button
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-xl
          font-medium text-sm
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANT_CLASSES[variant]}
        `}
      >
        {loading ? (
          <>
            <Spinner />
            <span>Calling {functionName}…</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{displayLabel}</span>
          </>
        )}
      </button>

      {/* Success */}
      {txId && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-mono truncate max-w-xs">{txId}</span>
        </div>
      )}

      {/* Error */}
      {displayError && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

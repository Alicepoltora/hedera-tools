import { useState, type FormEvent } from 'react';
import { AccountId, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType, Hbar } from '@hiero-ledger/sdk';
import { useHedera } from '../hooks/useHedera';


export interface TokenMintResult {
  tokenId: string;
  txId?: string;
}

export interface TokenMintFormProps {
  /** Called after successful token creation */
  onSuccess?: (result: TokenMintResult) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Extra CSS classes for the form wrapper */
  className?: string;
}

const DEMO_DELAY = 1400;

function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        id={id}
        className="
          w-full px-3 py-2 rounded-lg
          bg-slate-800 border border-slate-700
          text-slate-100 text-sm placeholder-slate-500
          focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50
          transition-colors
        "
        {...props}
      />
    </div>
  );
}

/**
 * Ready-made form for creating a Hedera Token Service (HTS) fungible token.
 * Handles wallet signing via the connected HashPack account.
 *
 * @example
 * <TokenMintForm onSuccess={({ tokenId }) => console.log(tokenId)} />
 */
export function TokenMintForm({ onSuccess, onError, className = '' }: TokenMintFormProps) {
  const { signer, accountId, isConnected, demoMode } = useHedera();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('2');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [maxSupply, setMaxSupply] = useState('10000000');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenMintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConnected || !accountId) {
      setError('Connect your wallet first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // ── Demo mode ──
    if (demoMode) {
      await new Promise((r) => setTimeout(r, DEMO_DELAY));
      const fakeResult: TokenMintResult = {
        tokenId: `0.0.${Math.floor(Math.random() * 9_000_000) + 1_000_000}`,
      };
      setResult(fakeResult);
      onSuccess?.(fakeResult);
      setLoading(false);
      return;
    }

    // ── Real mode ──
    try {
      if (!signer) throw new Error('Wallet signer not available');

      const adminKey = PrivateKey.generateECDSA();
      const supplyKey = PrivateKey.generateECDSA();

      const tx = await new TokenCreateTransaction()
        .setTokenName(name.trim())
        .setTokenSymbol(symbol.trim().toUpperCase())
        .setDecimals(Number(decimals))
        .setInitialSupply(Number(initialSupply))
        .setMaxSupply(Number(maxSupply))
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Finite)
        .setTreasuryAccountId(AccountId.fromString(accountId))
        .setAdminKey(adminKey.publicKey)
        .setSupplyKey(supplyKey.publicKey)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWithSigner(signer);

      const response = await tx.executeWithSigner(signer);
      const receipt = await response.getReceiptWithSigner(signer);
      const tokenId = receipt.tokenId?.toString();
      if (!tokenId) throw new Error('No token ID in receipt');

      const mintResult: TokenMintResult = {
        tokenId,
        txId: response.transactionId.toString(),
      };
      setResult(mintResult);
      onSuccess?.(mintResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token creation failed';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-1">Create HTS Token</h3>
      <p className="text-sm text-slate-500 mb-5">
        Deploy a new fungible token on the Hedera Token Service.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Token Name"
            id="token-name"
            placeholder="Carbon Credit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            label="Symbol"
            id="token-symbol"
            placeholder="CCR"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            maxLength={10}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Decimals"
            id="token-decimals"
            type="number"
            min="0"
            max="18"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
          />
          <Field
            label="Initial Supply"
            id="token-supply"
            type="number"
            min="1"
            value={initialSupply}
            onChange={(e) => setInitialSupply(e.target.value)}
          />
          <Field
            label="Max Supply"
            id="token-max"
            type="number"
            min="1"
            value={maxSupply}
            onChange={(e) => setMaxSupply(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isConnected}
          className="
            w-full py-2.5 rounded-xl
            bg-violet-600 hover:bg-violet-500 active:bg-violet-700
            text-white font-semibold text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Creating token…
            </>
          ) : (
            'Create Token →'
          )}
        </button>
      </form>

      {/* Success */}
      {result && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/40">
          <p className="text-emerald-400 text-sm font-medium">✅ Token created!</p>
          <p className="text-emerald-300/80 text-xs font-mono mt-1 break-all">
            Token ID: {result.tokenId}
          </p>
          {result.txId && (
            <p className="text-slate-500 text-xs font-mono mt-0.5 break-all">
              Tx: {result.txId}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-700/40">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {!isConnected && (
        <p className="mt-3 text-slate-500 text-xs text-center">
          Connect your wallet above to create a token.
        </p>
      )}
    </div>
  );
}

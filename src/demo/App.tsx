import { useState } from 'react';
import {
  HederaProvider,
  ConnectButton,
  TokenMintForm,
  HCSLogger,
  useHedera,
  useTransfer,
  type TokenMintResult,
} from '../lib';

// ─────────────────────────────────────────────
// Inner demo — uses hooks, must be inside HederaProvider
// ─────────────────────────────────────────────

function DemoContent() {
  const { accountId, balance, isConnected, network } = useHedera();
  const { transfer, loading: transferLoading, error: transferError, txId } = useTransfer();

  const [toAccount, setToAccount] = useState('0.0.98'); // Hedera fee account
  const [amount, setAmount] = useState('1');
  const [mintResult, setMintResult] = useState<TokenMintResult | null>(null);

  const handleTransfer = () => {
    void transfer(toAccount, Number(amount));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-bold">
            H
          </div>
          <span className="font-semibold text-slate-100">hedera-ui-kit</span>
          <span className="text-xs bg-violet-600/20 text-violet-400 border border-violet-600/30 px-2 py-0.5 rounded-full">
            demo
          </span>
        </div>
        <ConnectButton showBalance />
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 py-6">
          <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 text-violet-400 text-sm px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Hedera Hello Future Apex 2026 — Hiero Bounty
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            hedera-ui-kit
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Open-source React component library for Hedera developers.
            <br />
            <span className="text-slate-500">
              Drop-in hooks and components for HTS, HCS, and wallet connection.
            </span>
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <code className="bg-slate-800 text-emerald-400 px-4 py-2 rounded-lg text-sm font-mono">
              npm install hedera-ui-kit
            </code>
          </div>
        </section>

        {/* Status card */}
        {isConnected && accountId && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Connected account</p>
              <p className="font-mono text-lg text-white mt-0.5">{accountId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Balance</p>
              <p className="font-mono text-2xl text-emerald-400 mt-0.5">
                {balance?.toFixed(4) ?? '—'} <span className="text-base">ℏ</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Network</p>
              <span className="inline-block mt-1 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">
                {network}
              </span>
            </div>
          </div>
        )}

        {/* Components showcase */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Components
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ConnectButton variants */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">&lt;ConnectButton /&gt;</h3>
              <p className="text-sm text-slate-500">
                Plug-and-play HashPack wallet connect button with auto-state management.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <ConnectButton />
                <ConnectButton showBalance label="Connect HashPack" />
              </div>
              <pre className="text-xs bg-slate-800 text-slate-300 rounded-lg p-3 overflow-x-auto">
                {`<ConnectButton showBalance />`}
              </pre>
            </div>

            {/* Transfer */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">useTransfer()</h3>
              <p className="text-sm text-slate-500">
                Send HBAR from the connected wallet in one line.
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder="0.0.98"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                />
                <input
                  className="w-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-violet-500"
                  placeholder="ℏ"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  onClick={handleTransfer}
                  disabled={transferLoading || !isConnected}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
                >
                  {transferLoading ? '…' : 'Send'}
                </button>
              </div>
              {txId && <p className="text-xs text-emerald-400 font-mono break-all">✅ {txId}</p>}
              {transferError && <p className="text-xs text-red-400">⚠️ {transferError}</p>}
              <pre className="text-xs bg-slate-800 text-slate-300 rounded-lg p-3 overflow-x-auto">
                {`const { transfer } = useTransfer();\nawait transfer('0.0.98', 1); // 1 ℏ`}
              </pre>
            </div>
          </div>
        </section>

        {/* HTS + HCS */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
            HTS &amp; HCS
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TokenMintForm
              onSuccess={(r) => setMintResult(r)}
            />
            {mintResult && (
              <HCSLogger
                defaultTopicId=""
                pollInterval={0}
                limit={8}
              />
            )}
            {!mintResult && (
              <HCSLogger
                defaultTopicId="0.0.12345"
                pollInterval={0}
                limit={8}
              />
            )}
          </div>
        </section>

        {/* Quick-start code */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Quick Start
          </h2>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <pre className="text-sm text-slate-300 overflow-x-auto leading-relaxed">
{`import { HederaProvider, ConnectButton, useHCS } from 'hedera-ui-kit';

function App() {
  return (
    <HederaProvider
      network="testnet"
      walletConnectProjectId="YOUR_PROJECT_ID"
      demoMode   // ← remove in production
    >
      <ConnectButton showBalance />
      <MyDApp />
    </HederaProvider>
  );
}

function MyDApp() {
  const { submitMessage } = useHCS();
  return (
    <button onClick={() =>
      submitMessage('0.0.12345', { co2Offset: 42, unit: 'kg' })
    }>
      Log to Hedera
    </button>
  );
}`}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root — wraps everything in HederaProvider
// ─────────────────────────────────────────────

export default function App() {
  return (
    <HederaProvider
      network="testnet"
      walletConnectProjectId="YOUR_WALLETCONNECT_PROJECT_ID"
      demoMode // demo mode ON — remove when using real HashPack
      appMetadata={{
        name: 'hedera-ui-kit Demo',
        description: 'Open-source React UI library for Hedera developers',
      }}
    >
      <DemoContent />
    </HederaProvider>
  );
}

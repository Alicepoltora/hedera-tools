import { useState } from 'react';
import {
  HederaProvider,
  ConnectButton,
  NetworkSwitcher,
  TokenMintForm,
  HCSLogger,
  HBARAmount,
  TokenCard,
  TransactionStatus,
  useHedera,
  useTransfer,
  useTokenBalance,
  useAccountInfo,
  useStaking,
  useTokenAssociate,
  type TokenMintResult,
} from '../lib';

// ─────────────────────────────────────────────
// Sidebar nav
// ─────────────────────────────────────────────

const SECTIONS = ['Overview', 'Wallet', 'HTS Tokens', 'HCS Logger', 'Staking', 'Contracts'] as const;
type Section = (typeof SECTIONS)[number];

// ─────────────────────────────────────────────
// Overview section
// ─────────────────────────────────────────────

function OverviewSection() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">hedera-ui-kit</h2>
        <p className="text-slate-400 text-lg max-w-xl">
          Open-source React component library for Hedera developers.
          Everything you need to build on Hedera — in one package.
        </p>
        <code className="inline-block bg-slate-800 text-emerald-400 px-4 py-2 rounded-lg text-sm font-mono">
          npm install hedera-ui-kit
        </code>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hooks', value: '10', icon: '🪝', desc: 'wallet, HTS, HCS, contracts' },
          { label: 'Components', value: '7', icon: '🧩', desc: 'plug-and-play UI' },
          { label: 'Demo Mode', value: '✓', icon: '🎭', desc: 'no wallet needed' },
          { label: 'TypeScript', value: '100%', icon: '💙', desc: 'full type safety' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm font-medium text-slate-300">{s.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Full API
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          {[
            ['useHedera()', 'Wallet state, connect/disconnect'],
            ['useTransfer()', 'Send HBAR between accounts'],
            ['useHCS()', 'Submit & read HCS topic messages'],
            ['useMirrorNode()', 'Generic Mirror Node query'],
            ['useTokenBalance()', 'HTS token balance for any account'],
            ['useAccountInfo()', 'Full account info from Mirror Node'],
            ['useNFT()', 'NFT metadata, collections, ownership'],
            ['useStaking()', 'Staking info & pending rewards'],
            ['useContractRead()', 'Read smart contract (eth_call)'],
            ['useContractWrite()', 'Execute contract function (signed)'],
            ['useTokenAssociate()', 'Associate/dissociate HTS tokens'],
            ['<ConnectButton />', 'HashPack wallet connect button'],
            ['<NetworkSwitcher />', 'Switch testnet/mainnet/previewnet'],
            ['<TokenMintForm />', 'Create HTS fungible token'],
            ['<HCSLogger />', 'Submit & view HCS messages'],
            ['<TransactionStatus />', 'Live tx polling with HashScan link'],
            ['<HBARAmount />', 'HBAR formatter with USD price'],
            ['<TokenCard />', 'Token metadata card from Mirror Node'],
          ].map(([name, desc]) => (
            <div key={name} className="flex gap-2 py-1 border-b border-slate-800/50 last:border-0">
              <code className="text-violet-400 font-mono text-xs shrink-0 w-44">{name}</code>
              <span className="text-slate-500 text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Wallet section
// ─────────────────────────────────────────────

function WalletSection() {
  const { accountId, balance, isConnected, network } = useHedera();
  const { transfer, loading: tLoading, txId: transferTxId, error: tError } = useTransfer();
  const { info: accInfo } = useAccountInfo();

  const [toAccount, setToAccount] = useState('0.0.98');
  const [amount, setAmount] = useState('1');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Wallet</h2>

      {/* Connect card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">&lt;ConnectButton /&gt;</h3>
          <ConnectButton showBalance />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">&lt;NetworkSwitcher /&gt;</h3>
          <NetworkSwitcher variant="pills" />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">&lt;HBARAmount /&gt;</h3>
          <HBARAmount value={balance ?? 1234.5678} showUsd size="lg" />
        </div>
      </div>

      {/* Account info */}
      {isConnected && accInfo && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h3 className="font-medium text-white mb-4">useAccountInfo()</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Account ID</p>
              <p className="font-mono text-slate-200">{accInfo.accountId}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">EVM Address</p>
              <p className="font-mono text-slate-200 truncate text-xs">{accInfo.evmAddress ?? '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Network</p>
              <p className="font-mono text-amber-400">{network}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Associated tokens</p>
              <p className="font-mono text-slate-200">{accInfo.tokens.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transfer */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h3 className="font-medium text-white">useTransfer()</h3>
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            placeholder="To account (0.0.98)" value={toAccount} onChange={(e) => setToAccount(e.target.value)} />
          <input className="w-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-violet-500"
            type="number" min="0" placeholder="ℏ" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button disabled={tLoading || !isConnected}
            onClick={() => void transfer(toAccount, Number(amount))}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
            {tLoading ? '…' : 'Send ℏ'}
          </button>
        </div>
        {tError && <p className="text-red-400 text-xs">⚠️ {tError}</p>}
        <TransactionStatus txId={transferTxId} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HTS Tokens section
// ─────────────────────────────────────────────

function HTSSection() {
  const { isConnected } = useHedera();
  const [mintResult, setMintResult] = useState<TokenMintResult | null>(null);
  const [lookupId, setLookupId] = useState('0.0.1234567');
  const { balance, loading: balLoading } = useTokenBalance(lookupId);
  const { associate, dissociate, loading: assocLoading, txId: assocTxId } = useTokenAssociate();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">HTS Tokens</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <TokenMintForm onSuccess={setMintResult} />
          {mintResult && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-700/30 p-4 text-sm">
              <p className="text-emerald-400 font-semibold mb-1">✅ Token created</p>
              <p className="font-mono text-emerald-300/80 text-xs break-all">{mintResult.tokenId}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Token lookup */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-medium text-white">useTokenBalance() + &lt;TokenCard /&gt;</h3>
            <input className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              placeholder="Token ID (0.0.XXXXXX)" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
            {balance && (
              <p className="text-sm text-slate-300">
                Balance: <span className="font-mono text-violet-400">{balance.formatted.toLocaleString()} {balance.symbol}</span>
                {balLoading && <span className="ml-2 text-slate-500 text-xs">updating…</span>}
              </p>
            )}
          </div>

          <TokenCard tokenId={lookupId} showId />

          {/* Token associate */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-medium text-white">useTokenAssociate()</h3>
            <p className="text-xs text-slate-500">Associate/dissociate a token before receiving it.</p>
            <div className="flex gap-2">
              <button disabled={assocLoading || !isConnected}
                onClick={() => void associate(lookupId)}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                {assocLoading ? '…' : 'Associate'}
              </button>
              <button disabled={assocLoading || !isConnected}
                onClick={() => void dissociate(lookupId)}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold disabled:opacity-40 transition-colors">
                Dissociate
              </button>
            </div>
            <TransactionStatus txId={assocTxId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Staking section
// ─────────────────────────────────────────────

function StakingSection() {
  const { stakingInfo, networkNodes, loading } = useStaking();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Staking — useStaking()</h2>

      {loading ? (
        <p className="text-slate-500">Loading staking info…</p>
      ) : (
        <div className="space-y-4">
          {stakingInfo && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Staked Node', value: stakingInfo.stakedNodeId != null ? `Node ${stakingInfo.stakedNodeId}` : 'None' },
                { label: 'Pending Reward', value: `${stakingInfo.pendingReward.toFixed(6)} ℏ` },
                { label: 'Decline Reward', value: stakingInfo.declineReward ? 'Yes' : 'No' },
                { label: 'Stake Since', value: stakingInfo.stakePeriodStart ? new Date(stakingInfo.stakePeriodStart).toLocaleDateString() : '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className="font-mono text-sm text-slate-200">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {networkNodes.length > 0 && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <h3 className="font-medium text-white text-sm">Network Nodes</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {networkNodes.slice(0, 5).map((node) => (
                  <div key={node.nodeId} className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{node.description || `Node ${node.nodeId}`}</span>
                    <span className="font-mono text-slate-400">{node.stake.toLocaleString()} ℏ</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Contracts section
// ─────────────────────────────────────────────

function ContractsSection() {
  const { isConnected } = useHedera();
  const [contractId, setContractId] = useState('0.0.1234567');
  const [fnName, setFnName] = useState('transfer');
  const { write, loading, txId, error } = useContractWrite();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Smart Contracts</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <h3 className="font-medium text-white">useContractWrite()</h3>
          <p className="text-xs text-slate-500">Execute a state-changing smart contract function via wallet signing.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Contract ID</label>
              <input className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-violet-500"
                value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="0.0.XXXXX" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Function Name</label>
              <input className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-violet-500"
                value={fnName} onChange={(e) => setFnName(e.target.value)} placeholder="transfer" />
            </div>
            <button disabled={loading || !isConnected}
              onClick={() => void write({ contractId, functionName: fnName, gas: 100_000 })}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-40 transition-colors">
              {loading ? 'Executing…' : 'Execute →'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}
          <TransactionStatus txId={txId} />
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <h3 className="font-medium text-white">useContractRead()</h3>
          <p className="text-xs text-slate-500">
            Read data from a smart contract using JSON-RPC Relay (eth_call). No wallet needed.
          </p>
          <pre className="text-xs bg-slate-800 rounded-lg p-3 text-slate-300 overflow-x-auto">{`const { data } = useContractRead(
  '0xABC...EVM_ADDRESS',
  encodedCallData,  // viem/ethers encoded
  { pollInterval: 5000 }
);`}</pre>
          <div className="bg-slate-800/60 rounded-lg p-3 text-xs font-mono text-slate-400">
            <p className="text-slate-500 mb-1">JSON-RPC Relay:</p>
            <p className="text-emerald-400">https://testnet.hashio.io/api</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Import useContractWrite in ContractsSection
// ─────────────────────────────────────────────

import { useContractWrite } from '../lib';

// ─────────────────────────────────────────────
// Main demo shell
// ─────────────────────────────────────────────

function DemoShell() {
  const [active, setActive] = useState<Section>('Overview');
  const { isConnected, demoMode } = useHedera();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white">H</div>
            <span className="font-semibold text-slate-100 text-sm">hedera-ui-kit</span>
          </div>
          {demoMode && (
            <span className="mt-2 inline-block text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              demo mode
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${active === s
                  ? 'bg-violet-600/20 text-violet-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
              `}
            >
              {s}
            </button>
          ))}
        </nav>

        {/* Connect button at bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <NetworkSwitcher className="w-full" />
          <ConnectButton
            className="w-full justify-center"
            showBalance={isConnected}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {active === 'Overview'  && <OverviewSection />}
          {active === 'Wallet'    && <WalletSection />}
          {active === 'HTS Tokens' && <HTSSection />}
          {active === 'HCS Logger' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">HCS Logger</h2>
              <HCSLogger defaultTopicId="0.0.12345" pollInterval={0} limit={10} />
            </div>
          )}
          {active === 'Staking'   && <StakingSection />}
          {active === 'Contracts' && <ContractsSection />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────

export default function App() {
  return (
    <HederaProvider
      network="testnet"
      walletConnectProjectId="YOUR_WALLETCONNECT_PROJECT_ID"
      demoMode
      appMetadata={{ name: 'hedera-ui-kit Demo' }}
    >
      <DemoShell />
    </HederaProvider>
  );
}

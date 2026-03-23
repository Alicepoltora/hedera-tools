import { useState, Component, type ReactNode, type ErrorInfo } from 'react';
import {
  HederaProvider,
  ConnectButton,
  NetworkSwitcher,
  TokenMintForm,
  HCSLogger,
  HBARAmount,
  TokenCard,
  TransactionStatus,
  AccountCard,
  HBARPriceWidget,
  NFTGallery,
  TransactionHistory,
  StakingPanel,
  TopicMessageFeed,
  ContractCallButton,
  AIChat,
  useHedera,
  useTransfer,
  useTokenBalance,
  useAccountInfo,
  useStaking,
  useTokenAssociate,
  useContractWrite,
  useContractRead,
  useNFT,
  useTokenCreate,
  useTokenBurn,
  useTokenInfo,
  useAccountTransactions,
  useExchangeRate,
  useScheduledTransaction,
  useFileService,
  type TokenMintResult,
} from '../lib';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-700/40 space-y-3">
          <p className="text-red-400 font-semibold text-sm">⚠️ Component crashed</p>
          <pre className="text-xs text-red-300 bg-slate-950 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 rounded-lg bg-red-900/50 text-red-300 text-xs hover:bg-red-900 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 overflow-x-auto leading-relaxed">
        {children}
      </pre>
      <button
        onClick={() => { void navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
      >
        {copied ? '✓' : 'copy'}
      </button>
    </div>
  );
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 font-mono">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DemoCard({ title, badge, snippet, children }: { title: string; badge?: string; snippet?: string; children: React.ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 font-mono">
              {badge}
            </span>
          )}
          {snippet && (
            <button
              onClick={() => setShowCode(!showCode)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono ${
                showCode ? 'bg-violet-600/20 text-violet-300 border-violet-600/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {'</>'}
            </button>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {showCode && snippet ? <Code>{snippet}</Code> : children}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3.5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-mono text-sm text-slate-200 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>}
      <input
        {...props}
        className={`w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors ${props.className ?? ''}`}
      />
    </div>
  );
}

function Btn({
  children, onClick, disabled, variant = 'primary', className = '',
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; className?: string;
}) {
  const cls = {
    primary:   'bg-violet-600 hover:bg-violet-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    danger:    'bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-800/50',
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Overview
// ─────────────────────────────────────────────────────────────────────────────

function NpmBadge() {
  return (
    <a
      href="https://www.npmjs.com/package/hedera-ui-kit"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/60 transition-colors text-xs font-mono font-semibold"
    >
      <svg width="14" height="14" viewBox="0 0 780 250" fill="currentColor">
        <path d="M240 250V0H0v250h240zm-180-30V30h120v190H60zm300 30V30h-60V0h240v250h-60V30h-60v220h-60zm300-250v250h-60V0h60zm60 0h120v250h-60V30h-60V0z"/>
      </svg>
      hedera-ui-kit@1.0.0
    </a>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-white text-lg">H</div>
          <div>
            <h1 className="text-2xl font-bold text-white">hedera-ui-kit</h1>
            <p className="text-xs text-slate-500 font-mono">v1.0.0 · MIT License · 87 kB</p>
          </div>
        </div>
        <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
          Open-source React component library for Hedera developers — hooks for HTS, HCS, staking,
          smart contracts, and plug-and-play UI components. Built for the <span className="text-violet-400">Hedera Hello Future Apex 2026</span> Hackathon.
        </p>

        {/* Install command */}
        <div className="flex items-center gap-3">
          <Code>npm install hedera-ui-kit</Code>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🪝', value: '19', label: 'Hooks', sub: 'wallet · HTS · HCS · staking · contracts' },
          { icon: '🧩', value: '14', label: 'Components', sub: 'plug-and-play UI' },
          { icon: '🎭', value: 'Demo', label: 'Mode', sub: 'no real wallet needed' },
          { icon: '💙', value: '100%', label: 'TypeScript', sub: 'full type safety' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col">
            <span className="text-2xl mb-2">{s.icon}</span>
            <span className="text-2xl font-bold text-white">{s.value}</span>
            <span className="text-sm font-medium text-slate-300">{s.label}</span>
            <span className="text-xs text-slate-600 mt-0.5">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Quick start */}
      <Card title="Quick Start">
        <Code>{`import { HederaProvider, ConnectButton, useTransfer } from 'hedera-ui-kit';

function App() {
  return (
    <HederaProvider network="testnet" walletConnectProjectId="YOUR_ID" demoMode>
      <MyDapp />
    </HederaProvider>
  );
}

function MyDapp() {
  const { transfer, loading } = useTransfer();
  return (
    <>
      <ConnectButton showBalance />
      <button onClick={() => transfer('0.0.98', 1)} disabled={loading}>
        Send 1 ℏ to Hedera treasury
      </button>
    </>
  );
}`}</Code>
      </Card>

      {/* Full API reference */}
      <Card title="Full API Reference">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
          {[
            // Hooks
            ['useHedera()', 'Wallet state, connect/disconnect, demoMode'],
            ['useTransfer()', 'Send HBAR — returns { transfer, txId, loading }'],
            ['useHCS()', 'Submit & read Hedera Consensus Service messages'],
            ['useMirrorNode()', 'Generic Mirror Node GET with polling support'],
            ['useTokenBalance()', 'HTS token balance for connected account'],
            ['useAccountInfo()', 'Full account info: EVM address, tokens, keys'],
            ['useNFT()', 'NFT metadata, collections, account ownership'],
            ['useStaking()', 'Staking info & network nodes list'],
            ['useContractRead()', 'eth_call via JSON-RPC Relay (no wallet)'],
            ['useContractWrite()', 'ContractExecuteTransaction via signer'],
            ['useTokenAssociate()', 'Associate / dissociate HTS tokens'],
            // Components
            ['<ConnectButton />', 'HashPack connect/disconnect with balance'],
            ['<NetworkSwitcher />', 'Dropdown or pills — testnet/mainnet/previewnet'],
            ['<TokenMintForm />', 'Create HTS fungible token with one form'],
            ['<HCSLogger />', 'Submit messages + live feed from Mirror Node'],
            ['<TransactionStatus />', 'Live polling with HashScan explorer link'],
            ['<HBARAmount />', 'HBAR formatter with optional USD (CoinGecko)'],
            ['<TokenCard />', 'Token metadata card with skeleton loader'],
          ].map(([name, desc]) => (
            <div key={name} className="flex gap-3 py-2 border-b border-slate-800/40 last:border-0">
              <code className="text-violet-400 font-mono text-xs shrink-0 w-44">{name}</code>
              <span className="text-slate-500 text-xs leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Components Showcase
// ─────────────────────────────────────────────────────────────────────────────

function ComponentsSection() {
  const [hbarVal, setHbarVal] = useState(1234.5678);
  const [txId, setTxId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">UI Components</h2>

      {/* ConnectButton variants */}
      <DemoCard
        title="<ConnectButton />"
        badge="component"
        snippet={`import { ConnectButton } from 'hedera-ui-kit';

// Default
<ConnectButton />

// With balance display
<ConnectButton showBalance />

// Custom label & class
<ConnectButton
  connectLabel="Sign in with HashPack"
  className="w-full justify-center"
/>`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Default</span>
            <ConnectButton />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">showBalance</span>
            <ConnectButton showBalance />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">custom label</span>
            <ConnectButton label="Sign in with HashPack" />
          </div>
        </div>
      </DemoCard>

      {/* NetworkSwitcher variants */}
      <DemoCard
        title="<NetworkSwitcher />"
        badge="component"
        snippet={`import { NetworkSwitcher } from 'hedera-ui-kit';

// Dropdown (default)
<NetworkSwitcher />

// Pills variant
<NetworkSwitcher variant="pills" />

// Full width
<NetworkSwitcher className="w-full" />`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">dropdown (default)</span>
            <NetworkSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">pills variant</span>
            <NetworkSwitcher variant="pills" />
          </div>
        </div>
      </DemoCard>

      {/* HBARAmount variants */}
      <DemoCard
        title="<HBARAmount />"
        badge="component"
        snippet={`import { HBARAmount } from 'hedera-ui-kit';

<HBARAmount value={1234.56} />
<HBARAmount value={1234.56} showUsd size="xl" />
<HBARAmount value={0.0001} decimals={8} size="sm" />
<HBARAmount value={500} showUsd showSymbol={false} />`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">size=&quot;sm&quot;</span>
            <HBARAmount value={hbarVal} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">size=&quot;base&quot; (default)</span>
            <HBARAmount value={hbarVal} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">size=&quot;lg&quot;</span>
            <HBARAmount value={hbarVal} size="lg" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">size=&quot;xl&quot; + showUsd</span>
            <HBARAmount value={hbarVal} size="xl" showUsd />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500 shrink-0">value:</span>
            <input
              type="range" min="0" max="100000" step="100" value={hbarVal}
              onChange={(e) => setHbarVal(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-xs font-mono text-slate-400 w-20 text-right">{hbarVal.toLocaleString()} ℏ</span>
          </div>
        </div>
      </DemoCard>

      {/* TokenCard */}
      <DemoCard
        title="<TokenCard />"
        badge="component"
        snippet={`import { TokenCard } from 'hedera-ui-kit';

// Fetches metadata from Mirror Node automatically
<TokenCard tokenId="0.0.1234567" showId />

// With click handler
<TokenCard
  tokenId="0.0.1234567"
  onClick={(info) => console.log(info)}
/>`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TokenCard tokenId="0.0.1234567" showId />
          <TokenCard tokenId="0.0.9999999" showId />
        </div>
      </DemoCard>

      {/* TransactionStatus */}
      <DemoCard
        title="<TransactionStatus />"
        badge="component"
        snippet={`import { TransactionStatus } from 'hedera-ui-kit';

// Auto-polls Mirror Node until confirmed
<TransactionStatus txId="0.0.12345@1710000000.000000000" />

// Custom poll interval (ms)
<TransactionStatus txId={txId} pollInterval={5000} />

// No polling
<TransactionStatus txId={txId} poll={false} />`}
      >
        <div className="space-y-4">
          <Input
            label="Transaction ID"
            value={txId ?? ''}
            onChange={(e) => setTxId(e.target.value || null)}
            placeholder="0.0.12345@1710000000.000000000"
          />
          <TransactionStatus txId={txId} />
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Wallet & Accounts
// ─────────────────────────────────────────────────────────────────────────────

function WalletSection() {
  const { accountId, balance, isConnected, network, demoMode } = useHedera();
  const { transfer, loading: tLoading, txId: transferTxId, error: tError } = useTransfer();
  const { info: accInfo, loading: accLoading } = useAccountInfo();

  const [toAccount, setToAccount] = useState('0.0.98');
  const [amount, setAmount] = useState('1');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Wallet & Accounts</h2>

      {/* AccountCard component */}
      <DemoCard
        title="AccountCard"
        badge="component"
        snippet={`import { AccountCard } from 'hedera-ui-kit';\n\n<AccountCard showUSD showCopy />`}
      >
        <AccountCard showUSD showCopy />
      </DemoCard>

      {/* Wallet state */}
      <DemoCard
        title="useHedera()"
        badge="hook"
        snippet={`import { useHedera } from 'hedera-ui-kit';

const {
  accountId,    // '0.0.12345' | null
  balance,      // number (HBAR) | null
  isConnected,  // boolean
  network,      // 'testnet' | 'mainnet' | 'previewnet'
  demoMode,     // boolean
  connect,      // () => Promise<void>
  disconnect,   // () => void
  signer,       // DAppSigner | null
} = useHedera();`}
      >
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Account ID" value={accountId ?? '—'} />
          <StatBox label="Network" value={network} />
          <StatBox label="Balance" value={balance != null ? `${balance.toFixed(4)} ℏ` : '—'} />
          <StatBox label="Connected" value={isConnected ? '✅ Yes' : '❌ No'} sub={demoMode ? 'demo mode' : 'live'} />
        </div>
      </DemoCard>

      {/* Account Info */}
      <DemoCard
        title="useAccountInfo()"
        badge="hook"
        snippet={`import { useAccountInfo } from 'hedera-ui-kit';

const { info, loading, error } = useAccountInfo();
// info.accountId, info.evmAddress, info.balance,
// info.tokens[].tokenId, info.stakedNodeId, ...`}
      >
        {accLoading ? (
          <p className="text-slate-500 text-sm">Loading account info…</p>
        ) : accInfo ? (
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Account ID" value={accInfo.accountId} />
            <StatBox label="EVM Address" value={accInfo.evmAddress ? accInfo.evmAddress.slice(0, 20) + '…' : '—'} />
            <StatBox label="Balance" value={`${accInfo.balance.toFixed(4)} ℏ`} />
            <StatBox label="Tokens held" value={String(accInfo.tokens.length)} />
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Connect wallet to see account info (or enable demo mode).</p>
        )}
      </DemoCard>

      {/* Transfer */}
      <DemoCard
        title="useTransfer() — Send HBAR"
        badge="hook"
        snippet={`import { useTransfer } from 'hedera-ui-kit';

const { transfer, loading, txId, error } = useTransfer();

// Send 5 HBAR to 0.0.98 (Hedera treasury)
await transfer('0.0.98', 5);
// txId is populated once signed → feed into <TransactionStatus />`}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              label="To Account"
              className="flex-1"
              placeholder="0.0.98"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
            />
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">Amount ℏ</label>
              <input
                type="number" min="0" step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          {tError && <p className="text-red-400 text-xs">⚠️ {tError}</p>}
          <Btn
            disabled={tLoading || !isConnected}
            onClick={() => void transfer(toAccount, Number(amount))}
            className="w-full"
          >
            {tLoading ? 'Signing…' : `Send ${amount} ℏ →`}
          </Btn>
          {!isConnected && (
            <p className="text-xs text-slate-600 text-center">Connect wallet or enable demo mode to send</p>
          )}
          <TransactionStatus txId={transferTxId} />
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: HTS Tokens
// ─────────────────────────────────────────────────────────────────────────────

function HTSSection() {
  const { isConnected } = useHedera();
  const [mintResult, setMintResult] = useState<TokenMintResult | null>(null);
  const [lookupId, setLookupId] = useState('0.0.1234567');
  const { balance, loading: balLoading } = useTokenBalance(lookupId);
  const { associate, dissociate, loading: assocLoading, txId: assocTxId } = useTokenAssociate();

  // New hooks
  const [createName, setCreateName] = useState('My Token');
  const [createSymbol, setCreateSymbol] = useState('MTK');
  const { createToken, tokenId: newTokenId, loading: createLoading } = useTokenCreate();
  const [burnTokenId, setBurnTokenId] = useState('0.0.1234567');
  const [burnAmount, setBurnAmount] = useState('100');
  const { burnFungible, txId: burnTxId, loading: burnLoading } = useTokenBurn();
  const { info: tokenInfoData, loading: tiLoading } = useTokenInfo(lookupId);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">HTS Tokens</h2>
        <a
          href="https://www.npmjs.com/package/hedera-ui-kit"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/60 transition-colors text-xs font-mono font-semibold"
        >
          <svg width="13" height="13" viewBox="0 0 780 250" fill="currentColor">
            <path d="M240 250V0H0v250h240zm-180-30V30h120v190H60zm300 30V30h-60V0h240v250h-60V30h-60v220h-60zm300-250v250h-60V0h60zm60 0h120v250h-60V30h-60V0z"/>
          </svg>
          hedera-ui-kit
        </a>
      </div>

      {/* Token Create */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100 text-sm">useTokenCreate()</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 font-mono">hook</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Code snippet — always visible */}
          <Code>{`import { useTokenCreate } from 'hedera-ui-kit';

const { createToken, tokenId, loading, error } = useTokenCreate();

// Create fungible token
await createToken({
  name: 'My Token',
  symbol: 'MTK',
  type: 'FUNGIBLE',
  initialSupply: 1000,
  decimals: 2,
});

// Create NFT collection
await createToken({ name: 'My NFT', symbol: 'NFT', type: 'NFT' });

// tokenId → '0.0.XXXXXXX' on success`}</Code>

          {/* Live demo */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Token Name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              <Input label="Symbol" value={createSymbol} onChange={(e) => setCreateSymbol(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Btn
                onClick={() => void createToken({ name: createName, symbol: createSymbol, type: 'FUNGIBLE', initialSupply: 1000, decimals: 2 })}
                disabled={createLoading}
              >
                {createLoading ? 'Creating…' : '+ Create Fungible Token'}
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => void createToken({ name: createName, symbol: createSymbol, type: 'NFT' })}
                disabled={createLoading}
              >
                {createLoading ? 'Creating…' : '+ Create NFT Collection'}
              </Btn>
            </div>
            {newTokenId && (
              <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3">
                <p className="text-xs text-emerald-400 mb-1">Token Created</p>
                <p className="font-mono text-sm text-white">{newTokenId}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Token Burn */}
      <DemoCard
        title="useTokenBurn()"
        badge="hook"
        snippet={`import { useTokenBurn } from 'hedera-ui-kit';

const { burnFungible, burnNFT, txId } = useTokenBurn();

await burnFungible('0.0.1234567', 100);
await burnNFT('0.0.1234567', [1, 2, 3]);`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Token ID" value={burnTokenId} onChange={(e) => setBurnTokenId(e.target.value)} />
            <Input label="Amount" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} type="number" />
          </div>
          <Btn variant="danger" onClick={() => void burnFungible(burnTokenId, Number(burnAmount))} disabled={burnLoading}>
            {burnLoading ? 'Burning…' : 'Burn Tokens'}
          </Btn>
          {burnTxId && <StatBox label="Burn Tx" value={burnTxId} />}
        </div>
      </DemoCard>

      {/* Token lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DemoCard
          title="useTokenBalance()"
          badge="hook"
          snippet={`import { useTokenBalance } from 'hedera-ui-kit';

const { balance } = useTokenBalance('0.0.1234567');
// balance.balance   → raw units
// balance.decimals  → number
// balance.symbol    → 'MTK'
// balance.formatted → adjusted for decimals`}
        >
          <div className="space-y-3">
            <Input
              label="Token ID"
              placeholder="0.0.XXXXXX"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            {balance ? (
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Symbol" value={balance.symbol} />
                <StatBox label="Decimals" value={String(balance.decimals)} />
                <StatBox label="Raw Amount" value={String(balance.balance)} />
                <StatBox label="Formatted" value={`${balance.formatted.toLocaleString()} ${balance.symbol}`} sub={balLoading ? 'updating…' : ''} />
              </div>
            ) : (
              <p className="text-slate-600 text-xs">Enter a token ID to see balance</p>
            )}
          </div>
        </DemoCard>

        <DemoCard
          title="useTokenAssociate()"
          badge="hook"
          snippet={`import { useTokenAssociate } from 'hedera-ui-kit';

const { associate, dissociate, loading, txId } = useTokenAssociate();

// Required before receiving HTS tokens
await associate('0.0.1234567');
await dissociate('0.0.1234567');`}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Associate/dissociate a token for the connected account. Required before receiving HTS tokens.
            </p>
            <div className="text-xs text-slate-600 font-mono bg-slate-800/50 rounded-lg px-3 py-2">
              Token: <span className="text-violet-400">{lookupId}</span>
            </div>
            <div className="flex gap-2">
              <Btn disabled={assocLoading || !isConnected} onClick={() => void associate(lookupId)} className="flex-1">
                {assocLoading ? '…' : '+ Associate'}
              </Btn>
              <Btn variant="secondary" disabled={assocLoading || !isConnected} onClick={() => void dissociate(lookupId)} className="flex-1">
                − Dissociate
              </Btn>
            </div>
            {!isConnected && (
              <p className="text-xs text-slate-600 text-center">Connect wallet to use</p>
            )}
            <TransactionStatus txId={assocTxId} />
          </div>
        </DemoCard>
      </div>

      {/* Token Info */}
      <DemoCard
        title="useTokenInfo()"
        badge="hook"
        snippet={`import { useTokenInfo } from 'hedera-ui-kit';

const { info } = useTokenInfo('0.0.1234567');
// info.name, info.symbol, info.totalSupply
// info.type, info.supplyType, info.pauseStatus`}
      >
        <div className="space-y-3">
          <Input
            label="Token ID"
            placeholder="0.0.XXXXXX"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          {tiLoading ? (
            <p className="text-slate-500 text-sm animate-pulse">Loading…</p>
          ) : tokenInfoData ? (
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Name" value={tokenInfoData.name} />
              <StatBox label="Symbol" value={tokenInfoData.symbol} />
              <StatBox label="Total Supply" value={tokenInfoData.totalSupply.toLocaleString()} />
              <StatBox label="Type" value={tokenInfoData.type === 'FUNGIBLE_COMMON' ? 'Fungible' : 'NFT'} />
              <StatBox label="Supply Type" value={tokenInfoData.supplyType} />
              <StatBox label="Pause Status" value={tokenInfoData.pauseStatus} />
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Enter a token ID to see metadata.</p>
          )}
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: NFTs
// ─────────────────────────────────────────────────────────────────────────────

function NFTSection() {
  const [tokenId, setTokenId] = useState('0.0.1234567');
  const [serialNum, setSerialNum] = useState('1');
  const { nft, collection, accountNFTs, loading, error, fetchNFT, fetchCollection, fetchAccountNFTs } = useNFT();
  const { accountId } = useHedera();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">NFTs</h2>

      <DemoCard
        title="NFTGallery"
        badge="component"
        snippet={`import { NFTGallery } from 'hedera-ui-kit';\n\n<NFTGallery columns={3} onSelect={(nft) => console.log(nft)} />`}
      >
        <NFTGallery columns={3} />
      </DemoCard>

      <DemoCard
        title="useNFT() — NFT Metadata & Collections"
        badge="hook"
        snippet={`import { useNFT } from 'hedera-ui-kit';

const {
  nft, collection, accountNFTs, loading,
  fetchNFT, fetchCollection, fetchAccountNFTs
} = useNFT();

// Fetch single NFT metadata
await fetchNFT('0.0.1234567', 1);
// nft.tokenId, nft.serialNumber, nft.metadata, nft.owner

// Fetch all NFTs in a collection
await fetchCollection('0.0.1234567');
// collection.tokenId, collection.nfts[], collection.totalMinted

// Fetch NFTs owned by account
await fetchAccountNFTs('0.0.12345');`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Token ID"
              placeholder="0.0.XXXXXX"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
            <Input
              label="Serial #"
              type="number"
              min="1"
              placeholder="1"
              value={serialNum}
              onChange={(e) => setSerialNum(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => void fetchNFT(tokenId, Number(serialNum))} disabled={loading}>
              Fetch NFT #{serialNum}
            </Btn>
            <Btn variant="secondary" onClick={() => void fetchCollection(tokenId)} disabled={loading}>
              Fetch Collection
            </Btn>
            {accountId && (
              <Btn variant="secondary" onClick={() => void fetchAccountNFTs(accountId)} disabled={loading}>
                My NFTs
              </Btn>
            )}
          </div>

          {loading && <p className="text-slate-500 text-sm">Loading…</p>}
          {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}

          {nft && (
            <div className="rounded-xl bg-slate-800/60 p-4 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">NFT Details</p>
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Token ID" value={nft.tokenId} />
                <StatBox label="Serial #" value={String(nft.serialNumber)} />
                <StatBox label="Owner" value={nft.accountId ?? '—'} />
                <StatBox label="Metadata" value={nft.metadata ? nft.metadata.slice(0, 24) + '…' : '—'} />
              </div>
            </div>
          )}

          {collection && (
            <div className="rounded-xl bg-slate-800/60 p-4 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Collection</p>
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Token ID" value={collection.tokenId} />
                <StatBox label="Total Minted" value={String(collection.totalSupply)} />
              </div>
              {collection.nfts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {collection.nfts.slice(0, 4).map((n) => (
                    <div key={n.serialNumber} className="flex justify-between text-xs font-mono text-slate-400 py-1 border-b border-slate-700/50">
                      <span>#{n.serialNumber}</span>
                      <span className="text-slate-500 truncate ml-4">{n.accountId ?? '—'}</span>
                    </div>
                  ))}
                  {collection.nfts.length > 4 && (
                    <p className="text-xs text-slate-600">+{collection.nfts.length - 4} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          {accountNFTs && accountNFTs.length > 0 && (
            <div className="rounded-xl bg-slate-800/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">My NFTs ({accountNFTs.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {accountNFTs.slice(0, 4).map((n) => (
                  <div key={`${n.tokenId}-${n.serialNumber}`} className="bg-slate-900/60 rounded-lg p-2.5">
                    <p className="text-xs font-mono text-violet-400">{n.tokenId}</p>
                    <p className="text-xs text-slate-500">#{n.serialNumber}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: HCS Messaging
// ─────────────────────────────────────────────────────────────────────────────

function HCSSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">HCS Messaging</h2>

      <DemoCard
        title="<HCSLogger /> — Submit & Read Messages"
        badge="component"
        snippet={`import { HCSLogger } from 'hedera-ui-kit';

// Auto-polls Mirror Node for new messages
<HCSLogger
  defaultTopicId="0.0.12345"
  pollInterval={5000}   // ms; 0 = no poll
  limit={20}
/>`}
      >
        <HCSLogger defaultTopicId="0.0.12345" pollInterval={0} limit={10} />
      </DemoCard>

      <DemoCard
        title="TopicMessageFeed — Live HCS Feed"
        badge="component"
        snippet={`import { TopicMessageFeed } from 'hedera-ui-kit';\n\n<TopicMessageFeed topicId="0.0.9999999" pollInterval={3000} />`}
      >
        <TopicMessageFeed topicId="0.0.9999999" pollInterval={3000} />
      </DemoCard>

      <DemoCard
        title="useHCS() — Programmatic HCS Access"
        badge="hook"
        snippet={`import { useHCS } from 'hedera-ui-kit';

const {
  submit,    // (topicId, message) => Promise<txId>
  messages,  // HCSMessage[]
  loading,
  error,
  fetchMessages,
} = useHCS();

// Submit a message to a topic
const txId = await submit('0.0.12345', 'Hello Hedera!');

// Fetch latest messages
await fetchMessages('0.0.12345', { limit: 20 });

// HCSMessage shape:
// { sequenceNumber, message, consensusTimestamp, runningHash }`}
      >
        <div className="rounded-lg bg-slate-800/40 p-4 text-xs text-slate-500">
          Use the HCSLogger component above for a full interactive demo, or call <code className="text-violet-400">useHCS()</code> directly for programmatic access to topic submission and message fetching.
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Staking
// ─────────────────────────────────────────────────────────────────────────────

function StakingSection() {
  const { stakingInfo, networkNodes, loading } = useStaking();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Staking</h2>

      <DemoCard
        title="StakingPanel"
        badge="component"
        snippet={`import { StakingPanel } from 'hedera-ui-kit';\n\n<StakingPanel />`}
      >
        <StakingPanel />
      </DemoCard>

      <DemoCard
        title="useStaking() — Staking Info & Network Nodes"
        badge="hook"
        snippet={`import { useStaking } from 'hedera-ui-kit';

const { stakingInfo, networkNodes, loading, stake, unstake } = useStaking();

// stakingInfo.stakedNodeId      — which node you're staked to
// stakingInfo.pendingReward     — HBAR pending reward
// stakingInfo.declineReward     — boolean
// stakingInfo.stakePeriodStart  — ISO timestamp

// networkNodes[].nodeId
// networkNodes[].description
// networkNodes[].stake          — total staked HBAR

// Stake to a node
await stake(nodeId);`}
      >
        {loading ? (
          <p className="text-slate-500 text-sm">Loading staking info…</p>
        ) : (
          <div className="space-y-4">
            {stakingInfo && (
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  label="Staked Node"
                  value={stakingInfo.stakedNodeId != null ? `Node ${stakingInfo.stakedNodeId}` : 'None'}
                />
                <StatBox
                  label="Pending Reward"
                  value={`${stakingInfo.pendingReward.toFixed(6)} ℏ`}
                />
                <StatBox
                  label="Decline Reward"
                  value={stakingInfo.declineReward ? 'Yes' : 'No'}
                />
                <StatBox
                  label="Stake Period Start"
                  value={stakingInfo.stakePeriodStart ? new Date(stakingInfo.stakePeriodStart).toLocaleDateString() : '—'}
                />
              </div>
            )}

            {networkNodes.length > 0 && (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Network Nodes ({networkNodes.length})
                  </p>
                </div>
                <div className="divide-y divide-slate-800">
                  {networkNodes.slice(0, 7).map((node) => (
                    <div key={node.nodeId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-violet-600/20 text-violet-400 text-xs flex items-center justify-center font-mono font-bold">
                          {node.nodeId}
                        </span>
                        <span className="text-slate-300 text-xs">
                          {node.description || `Node ${node.nodeId}`}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {node.stake.toLocaleString()} ℏ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Smart Contracts
// ─────────────────────────────────────────────────────────────────────────────

function ContractsSection() {
  const { isConnected } = useHedera();

  // Write
  const [writeContractId, setWriteContractId] = useState('0.0.1234567');
  const [writeFnName, setWriteFnName] = useState('transfer');
  const [writeGas, setWriteGas] = useState('100000');
  const { write, loading: wLoading, txId: wTxId, error: wError } = useContractWrite();

  // Read
  const [readAddress, setReadAddress] = useState('0x0000000000000000000000000000000000abcdef');
  const { data: readData, loading: rLoading, error: rError, call: readCall } = useContractRead(readAddress, '0x', { immediate: false });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Smart Contracts</h2>

      {/* ContractCallButton */}
      <DemoCard
        title="ContractCallButton"
        badge="component"
        snippet={`import { ContractCallButton } from 'hedera-ui-kit';\n\n<ContractCallButton\n  contractId="0.0.1234567"\n  functionName="mint"\n  label="Mint Token"\n  onSuccess={(txId) => console.log(txId)}\n/>`}
      >
        <div className="flex flex-wrap gap-3">
          <ContractCallButton contractId="0.0.1234567" functionName="mint" label="Mint Token" variant="primary" />
          <ContractCallButton contractId="0.0.1234567" functionName="burn" label="Burn Token" variant="danger" />
          <ContractCallButton contractId="0.0.1234567" functionName="pause" label="Pause" variant="secondary" />
        </div>
      </DemoCard>

      {/* Write */}
      <DemoCard
        title="useContractWrite() — Execute Contract Function"
        badge="hook"
        snippet={`import { useContractWrite } from 'hedera-ui-kit';

const { write, loading, txId, error } = useContractWrite();

await write({
  contractId: '0.0.1234567',
  functionName: 'transfer',
  params: new ContractFunctionParameters()
    .addAddress('0x...')
    .addUint256(100),
  gas: 100_000,
  payableAmount: 0, // optional HBAR to attach
});`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contract ID"
              value={writeContractId}
              onChange={(e) => setWriteContractId(e.target.value)}
              placeholder="0.0.XXXXX"
            />
            <Input
              label="Function Name"
              value={writeFnName}
              onChange={(e) => setWriteFnName(e.target.value)}
              placeholder="transfer"
            />
          </div>
          <Input
            label="Gas"
            type="number"
            value={writeGas}
            onChange={(e) => setWriteGas(e.target.value)}
          />
          {wError && <p className="text-red-400 text-xs">⚠️ {wError}</p>}
          <Btn
            disabled={wLoading || !isConnected}
            onClick={() => void write({ contractId: writeContractId, functionName: writeFnName, gas: Number(writeGas) })}
            className="w-full"
          >
            {wLoading ? 'Executing…' : `Execute ${writeFnName}() →`}
          </Btn>
          {!isConnected && (
            <p className="text-xs text-slate-600 text-center">Connect wallet or demo mode required</p>
          )}
          <TransactionStatus txId={wTxId} />
        </div>
      </DemoCard>

      {/* Read */}
      <DemoCard
        title="useContractRead() — Read Contract State"
        badge="hook"
        snippet={`import { useContractRead } from 'hedera-ui-kit';

// eth_call via JSON-RPC Relay — no wallet needed
const { data, loading, error, refetch } = useContractRead(
  '0x000000000000000000000000000000000ABCDEF', // EVM address
  encodedCallData,   // viem / ethers ABI-encoded bytes
  {
    enabled: true,       // auto-fetch on mount
    pollInterval: 5000,  // optional live polling
  }
);

// Endpoint used: https://testnet.hashio.io/api`}
      >
        <div className="space-y-3">
          <Input
            label="Contract EVM Address (0x…)"
            value={readAddress}
            onChange={(e) => setReadAddress(e.target.value)}
            placeholder="0x0000000000000000000000000000000000abcdef"
          />
          <div className="rounded-lg bg-slate-800/40 p-3 space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">JSON-RPC Relay Endpoint</p>
            <p className="text-xs font-mono text-emerald-400">https://testnet.hashio.io/api</p>
          </div>
          {rError && <p className="text-red-400 text-xs">⚠️ {rError}</p>}
          {readData != null && (
            <div className="rounded-lg bg-slate-800/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Result</p>
              <p className="text-xs font-mono text-slate-300 break-all">{String(readData)}</p>
            </div>
          )}
          <Btn variant="secondary" disabled={rLoading} onClick={() => void readCall()} className="w-full">
            {rLoading ? 'Calling…' : 'eth_call →'}
          </Btn>
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Transactions
// ─────────────────────────────────────────────────────────────────────────────

function TransactionsSection() {
  const { accountId } = useHedera();
  const { transactions } = useAccountTransactions(undefined, { limit: 10 });

  return (
    <div className="space-y-6">
      <DemoCard
        title="AccountCard"
        badge="component"
        snippet={`import { AccountCard } from 'hedera-ui-kit';\n\n<AccountCard showUSD showQR />`}
      >
        <AccountCard showUSD showQR />
      </DemoCard>

      <DemoCard
        title="TransactionHistory"
        badge="component"
        snippet={`import { TransactionHistory } from 'hedera-ui-kit';\n\n<TransactionHistory showFees />`}
      >
        <TransactionHistory showFees />
      </DemoCard>

      <DemoCard
        title="useAccountTransactions"
        badge="hook"
        snippet={`const { transactions, hasMore, fetchMore } = useAccountTransactions();\nconsole.log(transactions[0]?.type); // 'CRYPTOTRANSFER'`}
      >
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Last {transactions.length} transactions for {accountId ?? 'not connected'}</p>
          {transactions.slice(0, 3).map((tx) => (
            <div key={tx.transactionId} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2.5">
              <span className="text-xs text-violet-300 font-mono">{tx.type}</span>
              <span className={`text-xs font-mono ${tx.hbarDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.hbarDelta >= 0 ? '+' : ''}{tx.hbarDelta.toFixed(4)} ℏ
              </span>
            </div>
          ))}
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Utilities
// ─────────────────────────────────────────────────────────────────────────────

function UtilitiesSection() {
  const { rate, toUSD } = useExchangeRate();
  const { scheduleTransfer, scheduleId, scheduleInfo, loading: schedLoading } = useScheduledTransaction();
  const { createFile, readFile, fileId, fileInfo, loading: fileLoading } = useFileService();

  const [schedTo, setSchedTo] = useState('0.0.9999999');
  const [schedAmount, setSchedAmount] = useState('10');
  const [schedMemo, setSchedMemo] = useState('Team payment Q1');

  const [fileContent, setFileContent] = useState('{"name":"on-chain file","version":"1.0"}');
  const [readFileId, setReadFileId] = useState('');

  return (
    <div className="space-y-6">
      <DemoCard
        title="HBARPriceWidget"
        badge="component"
        snippet={`import { HBARPriceWidget } from 'hedera-ui-kit';\n\n<HBARPriceWidget showNextRate />\n<HBARPriceWidget compact />`}
      >
        <div className="space-y-4">
          <HBARPriceWidget showNextRate />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Compact mode:</span>
            <HBARPriceWidget compact />
          </div>
        </div>
      </DemoCard>

      <DemoCard
        title="useExchangeRate"
        badge="hook"
        snippet={`const { rate, toUSD, toHBAR } = useExchangeRate();\nconst usdValue = toUSD(1000); // 1000 HBAR → USD`}
      >
        {rate ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="USD per HBAR" value={`$${rate.usdPerHbar.toFixed(6)}`} />
              <StatBox label="100 HBAR" value={`$${toUSD(100).toFixed(4)}`} />
              <StatBox label="$1 USD" value={`${(1 / rate.usdPerHbar).toFixed(2)} ℏ`} />
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm animate-pulse">Loading rate…</p>
        )}
      </DemoCard>

      <DemoCard
        title="useScheduledTransaction"
        badge="hook"
        snippet={`const { scheduleTransfer, scheduleId } = useScheduledTransaction();\nawait scheduleTransfer('0.0.9999', 100, 'Team payment');`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="To Account" value={schedTo} onChange={(e) => setSchedTo(e.target.value)} placeholder="0.0.9999999" />
            <Input label="Amount (HBAR)" value={schedAmount} onChange={(e) => setSchedAmount(e.target.value)} type="number" />
          </div>
          <Input label="Memo" value={schedMemo} onChange={(e) => setSchedMemo(e.target.value)} />
          <Btn onClick={() => void scheduleTransfer(schedTo, Number(schedAmount), schedMemo)} disabled={schedLoading}>
            {schedLoading ? 'Creating…' : 'Create Scheduled Tx'}
          </Btn>
          {scheduleId && (
            <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3">
              <p className="text-xs text-emerald-400 mb-1">Schedule ID</p>
              <p className="font-mono text-sm text-white">{scheduleId}</p>
              {scheduleInfo && (
                <p className="text-xs text-slate-500 mt-1">
                  Expires: {new Date(scheduleInfo.expirationTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      </DemoCard>

      <DemoCard
        title="useFileService"
        badge="hook"
        snippet={`const { createFile, readFile, fileId } = useFileService();\nconst id = await createFile('{"key":"value"}', 'My metadata');\nconst text = await readFile(id);`}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">File Contents</label>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
          <Btn onClick={() => void createFile(fileContent, 'Demo file')} disabled={fileLoading}>
            {fileLoading ? 'Creating…' : 'Create File on HFS'}
          </Btn>
          {fileId && (
            <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3 space-y-2">
              <p className="text-xs text-emerald-400">File ID: <span className="font-mono text-white">{fileId}</span></p>
              {fileInfo && <p className="text-xs text-slate-500">{fileInfo.size} bytes stored</p>}
            </div>
          )}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Read existing file</p>
            <div className="flex gap-2">
              <Input value={readFileId} onChange={(e) => setReadFileId(e.target.value)} placeholder="0.0.1234567" className="flex-1" />
              <Btn onClick={() => void readFile(readFileId)} disabled={fileLoading || !readFileId} variant="secondary">Read</Btn>
            </div>
          </div>
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: AI Agent
// ─────────────────────────────────────────────────────────────────────────────

function AIAgentSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">AI Agent</h2>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
          Natural language interface to Hedera. The agent understands commands, creates action cards, and executes transactions via your connected wallet after confirmation.
        </p>
      </div>

      {/* Architecture callout */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Architecture</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span className="bg-slate-700 px-2 py-1 rounded font-mono">AIChat</span>
          <span className="text-slate-600">→</span>
          <span className="bg-slate-700 px-2 py-1 rounded font-mono">useAIAgent</span>
          <span className="text-slate-600">→</span>
          <span className="bg-violet-900/40 border border-violet-700/40 px-2 py-1 rounded font-mono text-violet-300">/api/ai-agent</span>
          <span className="text-slate-600">→</span>
          <span className="bg-amber-900/30 border border-amber-700/30 px-2 py-1 rounded font-mono text-amber-300">Claude API</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Claude runs server-side (API key stays safe). Transactions are signed client-side via wallet. Set <code className="text-violet-400">ANTHROPIC_API_KEY</code> in Vercel env to enable real AI — demo mode uses scripted responses.
        </p>
      </div>

      {/* Live AIChat */}
      <DemoCard
        title="<AIChat />"
        badge="component"
        snippet={`import { AIChat } from 'hedera-ui-kit';

// Add ANTHROPIC_API_KEY to Vercel environment variables
// Without it — runs in scripted demo mode

<AIChat
  apiEndpoint="/api/ai-agent"
  placeholder="send 5 HBAR to 0.0.98..."
/>`}
      >
        <AIChat
          placeholder="Try: 'My balance', 'send 5 HBAR', 'create token Carbon Credit'…"
          maxHeight={380}
        />
      </DemoCard>

      {/* useAIAgent hook docs */}
      <DemoCard
        title="useAIAgent() — hook"
        badge="hook"
        snippet={`import { useAIAgent } from 'hedera-ui-kit';

const {
  messages,          // ChatMessage[] — full chat history
  loading,           // boolean — waiting for AI
  executing,         // boolean — signing transaction
  sendMessage,       // (text: string) => Promise<void>
  confirmAction,     // (messageId: string) => Promise<void>
  cancelAction,      // (messageId: string) => void
  clearChat,         // () => void
} = useAIAgent({ apiEndpoint: '/api/ai-agent' });

// Each ChatMessage may contain an action:
// { type: 'transfer_hbar', params: { to, amount }, description }
// Call confirmAction(msg.id) to execute it`}
      >
        <div className="space-y-3 text-sm text-slate-400">
          <p>The hook manages the full chat lifecycle — messages, AI calls, and on-chain execution. You can build a fully custom chat UI on top of it.</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { action: 'transfer_hbar', hook: 'useTransfer()' },
              { action: 'create_token', hook: 'useTokenCreate()' },
              { action: 'burn_tokens', hook: 'useTokenBurn()' },
              { action: 'schedule_transfer', hook: 'useScheduledTransaction()' },
              { action: 'submit_hcs_message', hook: 'useHCS()' },
              { action: 'associate_token', hook: 'useTokenAssociate()' },
            ].map((row) => (
              <div key={row.action} className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2">
                <code className="text-violet-300 font-mono truncate">{row.action}</code>
                <span className="text-slate-600">→</span>
                <code className="text-emerald-400 font-mono text-[11px] truncate">{row.hook}</code>
              </div>
            ))}
          </div>
        </div>
      </DemoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar navigation
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',      label: 'Overview',       icon: '🏠' },
  { id: 'components',    label: 'Components',     icon: '🧩' },
  { id: 'wallet',        label: 'Wallet',         icon: '👛' },
  { id: 'hts',           label: 'HTS Tokens',     icon: '🪙' },
  { id: 'nft',           label: 'NFTs',           icon: '🖼️' },
  { id: 'hcs',           label: 'HCS Messaging',  icon: '💬' },
  { id: 'staking',       label: 'Staking',        icon: '📈' },
  { id: 'contracts',     label: 'Contracts',      icon: '📄' },
  { id: 'transactions',  label: 'Transactions',   icon: '📋' },
  { id: 'utilities',     label: 'Utilities',      icon: '🔧' },
  { id: 'ai',            label: 'AI Agent',       icon: '🤖' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────

function DemoShell() {
  const [active, setActive] = useState<SectionId>('overview');
  const { isConnected, demoMode } = useHedera();

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-800 flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-sm font-bold text-white">H</div>
            <div>
              <p className="font-bold text-slate-100 text-sm leading-tight">hedera-ui-kit</p>
              <p className="text-xs text-slate-600">v1.0.0</p>
            </div>
          </div>
          {demoMode && (
            <div className="mt-3 flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              demo mode
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5
                ${active === s.id
                  ? 'bg-violet-600/20 text-violet-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}
              `}
            >
              <span className="text-base">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Bottom: connect + network */}
        <div className="p-4 border-t border-slate-800 space-y-2.5">
          <NetworkSwitcher className="w-full" />
          <ConnectButton className="w-full justify-center" showBalance={isConnected} />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
          {/* npm banner — shown on every page */}
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-700/30 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div>
                <p className="text-emerald-300 font-semibold text-sm">Published on npm</p>
                <p className="text-emerald-600 text-xs mt-0.5">Available to install right now</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <NpmBadge />
              <a
                href="https://github.com/Alicepoltora/hedera-tools"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://hedera-ui-kit.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-900/30 border border-violet-700/40 text-violet-400 hover:text-violet-300 transition-colors text-xs font-mono"
              >
                ↗ Live Demo
              </a>
            </div>
          </div>

          <ErrorBoundary key={active}>
            {active === 'overview'      && <OverviewSection />}
            {active === 'components'    && <ComponentsSection />}
            {active === 'wallet'        && <WalletSection />}
            {active === 'hts'           && <HTSSection />}
            {active === 'nft'           && <NFTSection />}
            {active === 'hcs'           && <HCSSection />}
            {active === 'staking'       && <StakingSection />}
            {active === 'contracts'     && <ContractsSection />}
            {active === 'transactions'  && <TransactionsSection />}
            {active === 'utilities'     && <UtilitiesSection />}
            {active === 'ai'            && <AIAgentSection />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <HederaProvider
      network="mainnet"
      walletConnectProjectId={import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'demo'}
      demoMode={!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID}
      appMetadata={{ name: 'hedera-ui-kit Demo', url: 'https://hedera-ui-kit.vercel.app' }}
    >
      <DemoShell />
    </HederaProvider>
  );
}

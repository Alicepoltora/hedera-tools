# hedera-ui-kit

[![npm version](https://img.shields.io/npm/v/hedera-ui-kit?color=crimson&logo=npm)](https://www.npmjs.com/package/hedera-ui-kit)
[![npm downloads](https://img.shields.io/npm/dm/hedera-ui-kit?color=crimson)](https://www.npmjs.com/package/hedera-ui-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/demo-live-22c55e?logo=vercel&logoColor=white)](https://hedera-ui-kit.vercel.app)

Open-source React component library for Hedera developers.
Hooks and plug-and-play UI components for HTS, HCS, staking, smart contracts, and HashPack wallet connection.

**[→ Live Demo](https://hedera-ui-kit.vercel.app)**

---

## Features

- 🪝 **11 hooks** — wallet, HTS tokens, HCS messaging, staking, NFTs, smart contracts, Mirror Node
- 🧩 **7 components** — connect button, network switcher, token forms, HCS logger, transaction status
- 🎭 **Demo mode** — simulate all blockchain interactions without a real wallet
- 💙 **TypeScript** — full type safety, `.d.ts` declarations included
- ⚡ **Tree-shakeable** — import only what you use
- 🌐 **Multi-network** — testnet / mainnet / previewnet

---

## Installation

```bash
npm install hedera-ui-kit
```

> **Peer dependencies** — must be installed in your project:
> ```bash
> npm install react react-dom
> ```

---

## Quick Start

```tsx
import { HederaProvider, ConnectButton, useTransfer } from 'hedera-ui-kit';

// 1. Wrap your app in HederaProvider
function App() {
  return (
    <HederaProvider
      network="testnet"
      walletConnectProjectId="YOUR_WALLETCONNECT_PROJECT_ID"
      demoMode // remove in production
      appMetadata={{ name: 'My Hedera App' }}
    >
      <MyDapp />
    </HederaProvider>
  );
}

// 2. Use hooks and components anywhere inside the provider
function MyDapp() {
  const { transfer, loading, txId } = useTransfer();

  return (
    <>
      <ConnectButton showBalance />
      <button onClick={() => transfer('0.0.98', 1)} disabled={loading}>
        Send 1 ℏ
      </button>
      {txId && <TransactionStatus txId={txId} />}
    </>
  );
}
```

---

## Components

### `<HederaProvider />`

Root context provider. Must wrap your application.

```tsx
<HederaProvider
  network="testnet"                  // 'testnet' | 'mainnet' | 'previewnet'
  walletConnectProjectId="YOUR_ID"   // from cloud.walletconnect.com
  demoMode={false}                   // simulate txs without real wallet
  appMetadata={{
    name: 'My App',
    url: 'https://myapp.com',
    description: 'Built on Hedera',
  }}
>
  {children}
</HederaProvider>
```

---

### `<ConnectButton />`

HashPack wallet connect / disconnect button.

```tsx
<ConnectButton />
<ConnectButton showBalance />
<ConnectButton connectLabel="Sign in with HashPack" className="w-full" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showBalance` | `boolean` | `false` | Show HBAR balance when connected |
| `connectLabel` | `string` | `'Connect Wallet'` | Text when disconnected |
| `disconnectLabel` | `string` | `'Disconnect'` | Text when connected |
| `className` | `string` | — | Extra CSS classes |

---

### `<NetworkSwitcher />`

Dropdown or pills to switch between Hedera networks.

```tsx
<NetworkSwitcher />
<NetworkSwitcher variant="pills" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'dropdown' \| 'pills'` | `'dropdown'` | Display style |
| `className` | `string` | — | Extra CSS classes |

---

### `<HBARAmount />`

Formatted HBAR value with optional live USD conversion (CoinGecko, 5-min cache).

```tsx
<HBARAmount value={1234.56} />
<HBARAmount value={1234.56} showUsd size="xl" />
<HBARAmount value={0.0001} decimals={8} size="sm" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Amount in HBAR |
| `showUsd` | `boolean` | `false` | Show USD equivalent |
| `size` | `'sm' \| 'base' \| 'lg' \| 'xl'` | `'base'` | Text size |
| `decimals` | `number` | `4` | Decimal places shown |
| `showSymbol` | `boolean` | `true` | Show ℏ symbol |

---

### `<TokenMintForm />`

Form to create a new HTS fungible token with a single wallet interaction.

```tsx
<TokenMintForm
  onSuccess={(result) => {
    console.log('Token ID:', result.tokenId);
    console.log('Tx ID:', result.txId);
  }}
  onError={(err) => console.error(err)}
/>
```

```ts
interface TokenMintResult {
  tokenId: string;
  txId: string | null;
}
```

---

### `<HCSLogger />`

Submit messages to an HCS topic and display the live message feed from Mirror Node.

```tsx
<HCSLogger
  defaultTopicId="0.0.12345"
  pollInterval={5000}  // ms; 0 = no polling
  limit={20}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultTopicId` | `string` | — | Pre-fill topic ID |
| `pollInterval` | `number` | `5000` | Mirror Node poll interval (ms) |
| `limit` | `number` | `10` | Max messages to display |

---

### `<TransactionStatus />`

Live transaction status polling with HashScan explorer link.

```tsx
<TransactionStatus txId="0.0.12345@1710000000.000000000" />
<TransactionStatus txId={txId} pollInterval={3000} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `txId` | `string \| null` | — | Hedera transaction ID |
| `pollInterval` | `number` | `3000` | Poll interval in ms |
| `poll` | `boolean` | `true` | Enable/disable polling |

---

### `<TokenCard />`

Token metadata card fetched from Mirror Node, with built-in skeleton loader.

```tsx
<TokenCard tokenId="0.0.1234567" showId />
<TokenCard tokenId="0.0.1234567" onClick={(info) => console.log(info)} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokenId` | `string` | — | Hedera token ID |
| `showId` | `boolean` | `false` | Display token ID in card |
| `onClick` | `(info: TokenInfo) => void` | — | Optional click handler |

---

## Hooks

### `useHedera()`

Primary wallet hook — returns state and connect / disconnect actions.

```tsx
const {
  accountId,   // string | null — '0.0.12345'
  balance,     // number | null — HBAR balance
  isConnected, // boolean
  network,     // 'testnet' | 'mainnet' | 'previewnet'
  demoMode,    // boolean
  connect,     // () => Promise<void>
  disconnect,  // () => void
  signer,      // DAppSigner | null — pass to SDK transactions
} = useHedera();
```

---

### `useTransfer()`

Send HBAR from the connected wallet to another account.

```tsx
const { transfer, loading, txId, error, reset } = useTransfer();

await transfer('0.0.9999', 5); // send 5 HBAR
// txId → pass to <TransactionStatus txId={txId} />
```

| Return | Type | Description |
|--------|------|-------------|
| `transfer` | `(to: string, amount: number) => Promise<string \| null>` | Execute transfer |
| `txId` | `string \| null` | Transaction ID after signing |
| `loading` | `boolean` | True while signing / broadcasting |
| `error` | `string \| null` | Error message |
| `reset` | `() => void` | Clear txId and error state |

---

### `useTokenBalance()`

HTS token balance for the connected account (or any account ID you pass).

```tsx
const { balance, loading, error, refetch } = useTokenBalance('0.0.1234567');

// Specify a different account:
const { balance } = useTokenBalance('0.0.1234567', '0.0.9999');

// balance.amount    → raw integer (before decimals)
// balance.formatted → amount / 10^decimals
// balance.symbol    → 'CCR'
// balance.decimals  → 2
// balance.name      → 'Carbon Credit'
```

---

### `useAccountInfo()`

Full account info from Mirror Node.

```tsx
const { info, loading, error, refetch } = useAccountInfo();
// Defaults to connected wallet — or pass any account ID:
const { info } = useAccountInfo('0.0.9999');

// info.accountId          → '0.0.12345'
// info.evmAddress         → '0xabc...' | null
// info.balance            → HBAR (float)
// info.stakedNodeId       → number | null
// info.pendingReward      → HBAR
// info.tokens[]           → [{ tokenId: '0.0.X', balance: number }]
// info.createdTimestamp   → ISO string
```

---

### `useNFT()`

NFT metadata, collections, and account ownership.

```tsx
const {
  nft, collection, accountNFTs, loading, error,
  fetchNFT, fetchCollection, fetchAccountNFTs,
} = useNFT();

// Single NFT
await fetchNFT('0.0.1234567', 1);
// nft.tokenId, nft.serialNumber, nft.metadata, nft.owner

// Entire collection
await fetchCollection('0.0.1234567');
// collection.tokenId, collection.nfts[], collection.totalMinted

// All NFTs owned by an account
await fetchAccountNFTs('0.0.12345');
```

---

### `useStaking()`

Staking info for the connected account and a list of network nodes.

```tsx
const { stakingInfo, networkNodes, loading, stake, unstake } = useStaking();

// stakingInfo.stakedNodeId     — node you're staked to (number | null)
// stakingInfo.pendingReward    — HBAR pending reward
// stakingInfo.declineReward    — boolean
// stakingInfo.stakePeriodStart — ISO timestamp

// networkNodes[].nodeId, .description, .stake

await stake(3); // stake to node 3
```

---

### `useHCS()`

Submit messages to and read from Hedera Consensus Service.

```tsx
const { submit, messages, loading, error, fetchMessages } = useHCS();

const txId = await submit('0.0.12345', 'Hello Hedera!');

await fetchMessages('0.0.12345', { limit: 20 });
// messages[].sequenceNumber
// messages[].message           → decoded UTF-8 string
// messages[].consensusTimestamp
// messages[].runningHash
```

---

### `useContractRead()`

Read smart contract state via `eth_call` through HashIO JSON-RPC Relay — no wallet required.

```tsx
const { data, loading, error, refetch } = useContractRead(
  '0x0000000000000000000000000000000000abcdef', // contract EVM address
  encodedCallData,   // viem / ethers ABI-encoded bytes | null
  {
    enabled: true,       // auto-fetch on mount (default: true)
    pollInterval: 5000,  // optional live polling in ms
  }
);
```

> Endpoint used: `https://testnet.hashio.io/api`

---

### `useContractWrite()`

Execute a state-changing smart contract function (requires connected wallet).

```tsx
const { write, loading, txId, error } = useContractWrite();

await write({
  contractId: '0.0.1234567',
  functionName: 'transfer',
  params: new ContractFunctionParameters()
    .addAddress('0x...')
    .addUint256(100),
  gas: 100_000,
  payableAmount: 0, // optional HBAR to attach
});
```

---

### `useTokenAssociate()`

Associate or dissociate HTS tokens for the connected account.

```tsx
const { associate, dissociate, loading, txId } = useTokenAssociate();

// Required before receiving a token for the first time
await associate('0.0.1234567');

// Remove association (account balance must be 0)
await dissociate('0.0.1234567');
```

---

### `useMirrorNode()`

Generic Mirror Node GET request with optional auto-polling.

```tsx
const { data, loading, error, refetch } = useMirrorNode<MyType>(
  '/api/v1/tokens/0.0.1234567',
  { pollInterval: 10_000 }
);
```

---

## TypeScript

All interfaces and types are exported:

```ts
import type {
  AccountInfo,
  TokenBalance,
  TokenMintResult,
  HCSMessage,
  NFTInfo,
  NFTCollection,
  StakingInfo,
  NetworkNode,
  HederaNetwork,
  HederaContextState,
} from 'hedera-ui-kit';
```

---

## Demo Mode

Set `demoMode` on `<HederaProvider>` to simulate all blockchain interactions without a real wallet or network. Transactions return fake IDs after a short delay — great for development, tests, and presentations.

```tsx
<HederaProvider network="testnet" walletConnectProjectId="any" demoMode>
  {children}
</HederaProvider>
```

---

## Requirements

| Package | Version |
|---------|---------|
| `react` | ≥ 18.0.0 |
| `react-dom` | ≥ 18.0.0 |

> **Note:** `@hiero-ledger/sdk` is pinned to `2.79.0` as a peer dependency of `hedera-wallet-connect`. Add `.npmrc` with `legacy-peer-deps=true` if you encounter install conflicts.

---

## License

MIT © 2026

Built for the [Hedera Hello Future Apex 2026 Hackathon](https://hedera.com/hackathon) — Hiero Bounty.

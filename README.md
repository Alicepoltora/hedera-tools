# hedera-ui-kit

> **Open-source React component library for Hedera developers.**
> Drop-in hooks and UI components for HTS token creation, HCS message logging, and HashPack wallet connection.

[![Hackathon](https://img.shields.io/badge/Hedera%20Apex%202026-Hiero%20Bounty-7c3aed)](https://hellofuturehackathon.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)

---

## The Problem

Building on Hedera today means writing the same boilerplate over and over:
- HashConnect initialisation (30+ lines)
- Wallet state management across components
- HTS token transactions with proper signing
- HCS message submission + Mirror Node polling

There is no React-native UI library that handles this for you — until now.

---

## The Solution

**hedera-ui-kit** gives you production-ready React components and hooks so you can focus on your app, not the SDK plumbing.

```tsx
// Before hedera-ui-kit: ~80 lines of boilerplate
// After:
import { HederaProvider, ConnectButton, useHCS } from 'hedera-ui-kit';

function App() {
  return (
    <HederaProvider network="testnet" walletConnectProjectId="...">
      <ConnectButton showBalance />   {/* done */}
      <MyDApp />
    </HederaProvider>
  );
}

function MyDApp() {
  const { submitMessage } = useHCS();
  return (
    <button onClick={() => submitMessage('0.0.12345', { co2Offset: 42 })}>
      Log to Hedera
    </button>
  );
}
```

---

## Live Demo

```bash
git clone https://github.com/Alicepoltora/hedera-tools.git
cd hedera-tools
npm install
npm run dev
```

Open http://localhost:5173 — the demo runs in **demoMode** by default (no wallet required).
Remove `demoMode` prop in `src/demo/App.tsx` to use real HashPack.

---

## Installation

```bash
npm install hedera-ui-kit
```

**Peer dependencies** (if not already installed):
```bash
npm install react react-dom
```

---

## Quick Start

### 1. Wrap your app

```tsx
import { HederaProvider } from 'hedera-ui-kit';

// Get your free project ID at https://cloud.walletconnect.com
function Root() {
  return (
    <HederaProvider
      network="testnet"
      walletConnectProjectId="YOUR_PROJECT_ID"
    >
      <App />
    </HederaProvider>
  );
}
```

### 2. Add the connect button

```tsx
import { ConnectButton } from 'hedera-ui-kit';

<ConnectButton showBalance />
```

### 3. Use the hooks

```tsx
import { useHedera, useTransfer, useHCS } from 'hedera-ui-kit';

function MyComponent() {
  const { accountId, balance, isConnected } = useHedera();
  const { transfer } = useTransfer();
  const { submitMessage, fetchMessages } = useHCS();

  // Send 5 HBAR
  await transfer('0.0.9999', 5);

  // Log to HCS
  await submitMessage('0.0.12345', { event: 'CO2_OFFSET', kg: 42 });

  // Read from Mirror Node
  const msgs = await fetchMessages('0.0.12345', 10);
}
```

### 4. Drop-in form components

```tsx
import { TokenMintForm, HCSLogger } from 'hedera-ui-kit';

<TokenMintForm onSuccess={({ tokenId }) => console.log(tokenId)} />

<HCSLogger
  defaultTopicId="0.0.12345"
  pollInterval={10_000}   // auto-refresh every 10s
  limit={20}
/>
```

---

## API Reference

### `<HederaProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `network` | `'testnet' \| 'mainnet' \| 'previewnet'` | `'testnet'` | Target Hedera network |
| `walletConnectProjectId` | `string` | required | WalletConnect Cloud project ID |
| `demoMode` | `boolean` | `false` | Simulate wallet interactions (no HashPack needed) |
| `appMetadata` | `object` | — | App name, description, URL, icons shown in wallet modal |

---

### `useHedera()`

```ts
const {
  accountId,      // string | null
  balance,        // number | null  (HBAR)
  network,        // HederaNetwork
  isConnected,    // boolean
  isConnecting,   // boolean
  connect,        // () => Promise<void>
  disconnect,     // () => Promise<void>
} = useHedera();
```

---

### `useTransfer()`

```ts
const {
  transfer,   // (toAccountId: string, amountHbar: number) => Promise<string | null>
  loading,    // boolean
  error,      // string | null
  txId,       // string | null
  reset,      // () => void
} = useTransfer();
```

---

### `useHCS()`

```ts
const {
  submitMessage,        // (topicId: string, payload: string | object) => Promise<string | null>
  fetchMessages,        // (topicId: string, limit?: number) => Promise<HCSMessage[]>
  loading,              // boolean
  error,                // string | null
  lastSequenceNumber,   // string | null
  reset,                // () => void
} = useHCS();
```

---

### `<ConnectButton>`

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | `'Connect Wallet'` |
| `showBalance` | `boolean` | `false` |
| `className` | `string` | `''` |

---

### `<TokenMintForm>`

| Prop | Type | Default |
|---|---|---|
| `onSuccess` | `(result: { tokenId: string; txId?: string }) => void` | — |
| `onError` | `(error: string) => void` | — |
| `className` | `string` | `''` |

---

### `<HCSLogger>`

| Prop | Type | Default |
|---|---|---|
| `defaultTopicId` | `string` | `''` |
| `pollInterval` | `number` (ms) | `0` (disabled) |
| `limit` | `number` | `10` |
| `className` | `string` | `''` |

---

## Project Structure

```
hedera-ui-kit/
├── src/
│   ├── lib/                        # 📦 Library — published to npm
│   │   ├── context/
│   │   │   └── HederaProvider.tsx  # Wallet state, network, demo mode
│   │   ├── hooks/
│   │   │   ├── useHedera.ts        # Account ID, balance, connect/disconnect
│   │   │   ├── useTransfer.ts      # Send HBAR with wallet signing
│   │   │   └── useHCS.ts           # Submit & fetch HCS messages
│   │   ├── components/
│   │   │   ├── ConnectButton.tsx   # HashPack connect/disconnect button
│   │   │   ├── TokenMintForm.tsx   # HTS fungible token creation form
│   │   │   └── HCSLogger.tsx       # HCS submit + Mirror Node message feed
│   │   └── index.ts                # Public API exports
│   │
│   └── demo/                       # 🖥 Demo app (for judges)
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
│
├── index.html
├── vite.config.ts                  # Dev = demo app | lib mode = npm build
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Build

```bash
# Run demo app (development)
npm run dev

# Build demo app
npm run build

# Build library for npm publishing
npm run build:lib
```

The library build outputs to `dist/` with:
- `hedera-ui-kit.js` — ES module
- `hedera-ui-kit.umd.cjs` — UMD (CommonJS)
- `index.d.ts` — TypeScript declarations

---

## Tech Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 |
| Hedera SDK | @hashgraph/sdk ^2.50 |
| Wallet | @hashgraph/hashconnect ^3 (WalletConnect-based) |

---

## Hackathon

| | |
|---|---|
| **Event** | [Hedera Hello Future Apex 2026](https://hellofuturehackathon.dev/) |
| **Track** | Open Track + Hiero Bounty |
| **Hiero Bounty** | *"Open-source developer library improving Hiero network interaction"* |
| **Deadline** | March 23, 2026 — 11:59 PM ET |

---

## Contributing

PRs and issues are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT © Alice

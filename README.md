# hedera-ui-kit

> Open-source React component library for Hedera developers — hooks and UI components for HTS, HCS, staking, NFTs, and smart contracts.

[![npm version](https://img.shields.io/npm/v/hedera-ui-kit)](https://www.npmjs.com/package/hedera-ui-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://hedera-ui-kit.vercel.app)

**hedera-ui-kit** is a batteries-included React toolkit that lets you add Hedera blockchain functionality to any React app in minutes. It ships 20 hooks and 15 UI components covering the full surface of the Hedera network: token creation, transfers, HCS messaging, NFT galleries, smart contract interaction, staking, file storage, scheduled transactions, and an AI assistant powered by Groq.

🌐 **Live demo:** https://hedera-ui-kit.vercel.app
📦 **npm:** https://www.npmjs.com/package/hedera-ui-kit
🐙 **GitHub:** https://github.com/Alicepoltora/hedera-tools

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [HederaProvider](#hederaProvider)
- [Hooks](#hooks)
  - [useHedera](#usehedera)
  - [useAccountInfo](#useaccountinfo)
  - [useAccountTransactions](#useaccounttransactions)
  - [useTransfer](#usetransfer)
  - [useTokenCreate](#usetokencreate)
  - [useTokenBurn](#usetokenburn)
  - [useTokenAssociate](#usetokenassociate)
  - [useTokenBalance](#usetokenbalance)
  - [useTokenInfo](#usetokeninfo)
  - [useNFT](#usenfт)
  - [useContractRead](#usecontractread)
  - [useContractWrite](#usecontractwrite)
  - [useHCS](#usehcs)
  - [useStaking](#usestaking)
  - [useFileService](#usefileservice)
  - [useScheduledTransaction](#usescheduledtransaction)
  - [useExchangeRate](#useexchangerate)
  - [useMirrorNode](#usemirrornode)
  - [useTopicMessages](#usetopicmessages)
  - [useAIAgent](#useaiagent)
- [Components](#components)
  - [ConnectButton](#connectbutton)
  - [AccountCard](#accountcard)
  - [HBARAmount](#hbaramount)
  - [HBARPriceWidget](#hbarpricewidget)
  - [NetworkSwitcher](#networkswitcher)
  - [TokenCard](#tokencard)
  - [TokenMintForm](#tokenmintform)
  - [NFTGallery](#nftgallery)
  - [TransactionStatus](#transactionstatus)
  - [TransactionHistory](#transactionhistory)
  - [StakingPanel](#stakingpanel)
  - [HCSLogger](#hcslogger)
  - [TopicMessageFeed](#topicmessagefeed)
  - [ContractCallButton](#contractcallbutton)
  - [AIChat](#aichat)
- [Demo Mode](#demo-mode)
- [Network Configuration](#network-configuration)
- [Architecture Notes](#architecture-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 🔗 **WalletConnect v2** — connects to HashPack and any Hedera-compatible wallet via the WalletConnect protocol
- 🪙 **HTS** — create, burn, associate/dissociate fungible tokens and NFT collections
- 📨 **HCS** — submit and read messages from Hedera Consensus Service topics
- 📁 **HFS** — create and append files on the Hedera File Service
- 📅 **Scheduled Transactions** — create multi-sig scheduled transfers and sign them
- 🏦 **Staking** — view staking info, stake to a network node, and unstake
- 🤖 **AI Agent** — Groq-powered chat assistant that can send HBAR, check balances, and answer Hedera questions
- 🧩 **15 plug-and-play UI components** — built with Tailwind CSS, ready to drop into any project
- 🎭 **Demo mode** — every hook and component works without a wallet, with simulated responses
- 🌐 **Multi-network** — testnet, mainnet, and previewnet support with one prop change

---

## Installation

```bash
npm install hedera-ui-kit
```

### Peer Dependencies

```bash
npm install react react-dom
```

---

## Quick Start

Wrap your application in `HederaProvider` and start using hooks and components:

```tsx
import { HederaProvider, ConnectButton, useHedera } from 'hedera-ui-kit';

function App() {
  return (
    <HederaProvider
      walletConnectProjectId="your-project-id"
      network="testnet"
    >
      <MyApp />
    </HederaProvider>
  );
}

function MyApp() {
  const { accountId, balance, isConnected } = useHedera();

  return (
    <div>
      <ConnectButton />
      {isConnected && (
        <p>Connected: {accountId} — {balance} HBAR</p>
      )}
    </div>
  );
}
```

Get your WalletConnect project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

---

## HederaProvider

The root provider that initialises the WalletConnect `DAppConnector`, manages wallet state, and makes everything available to child hooks and components.

```tsx
<HederaProvider
  walletConnectProjectId="YOUR_PROJECT_ID"
  network="testnet"
  demoMode={false}
  appMetadata={{
    name: "My Hedera App",
    description: "Built with hedera-ui-kit",
    url: "https://myapp.com",
    icons: ["https://myapp.com/icon.png"],
  }}
>
  {children}
</HederaProvider>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `walletConnectProjectId` | `string` | **required** | WalletConnect Cloud project ID |
| `network` | `'testnet' \| 'mainnet' \| 'previewnet'` | `'testnet'` | Target Hedera network |
| `demoMode` | `boolean` | `false` | Simulate wallet interactions without a real wallet |
| `appMetadata` | `object` | — | App name, description, URL, and icon shown in wallet pop-ups |

---

## Hooks

### useHedera

The primary hook. Returns wallet state and connect/disconnect actions.

```tsx
const {
  accountId,       // string | null — e.g. "0.0.1234567"
  balance,         // number | null — HBAR balance
  network,         // 'testnet' | 'mainnet' | 'previewnet'
  isConnected,     // boolean
  isConnecting,    // boolean — true while WalletConnect modal is open
  demoMode,        // boolean
  signer,          // DAppSigner | null — for advanced use
  connector,       // DAppConnector | null — for advanced use
  connect,         // () => Promise<void> — opens WalletConnect modal
  disconnect,      // () => Promise<void> — clears session
  setNetwork,      // (network: HederaNetwork) => void
} = useHedera();
```

**Notes:**
- Must be called inside `<HederaProvider>`.
- `signer` and `connector` are the raw WalletConnect objects. They are exposed for advanced use cases but most tasks can be done via the specialised hooks below.
- `balance` is automatically refreshed after the wallet connects.

---

### useAccountInfo

Fetches full account information from the Hedera Mirror Node. Accepts an optional account ID; defaults to the connected wallet account.

```tsx
const { info, loading, error, refetch } = useAccountInfo('0.0.1234567');

// info shape:
// {
//   accountId: string,
//   evmAddress: string | null,   // EVM-compatible 0x address
//   balance: number,             // HBAR
//   stakedNodeId: number | null,
//   pendingReward: number,       // HBAR pending staking reward
//   createdTimestamp: string,
//   tokens: Array<{ tokenId: string; balance: number }>,
//   memo: string,
// }
```

**Parameters:**
- `accountId` *(optional)* — Hedera account ID to look up. Defaults to the connected wallet's account.

**Returned values:**
- `info` — full `AccountInfo` object or `null` while loading.
- `loading` — `true` while fetching.
- `error` — error message string or `null`.
- `refetch` — manually trigger a refresh.

**Behaviour:** Automatically fetches on mount and whenever the target account changes. Fetches both account details and token balances in parallel.

---

### useAccountTransactions

Fetches the transaction history for an account from the Mirror Node.

```tsx
const { transactions, loading, error, refetch } = useAccountTransactions('0.0.1234567', 25);
```

**Parameters:**
- `accountId` *(optional)* — defaults to the connected wallet account.
- `limit` *(optional)* — number of transactions to return. Default: `25`.

**Returned values:**
- `transactions` — array of transaction objects with `transactionId`, `type`, `amount`, `timestamp`, `result`, and `transfers`.
- `loading`, `error`, `refetch` — standard async state.

---

### useTransfer

Sends HBAR from the connected wallet to another account.

```tsx
const { transfer, loading, error, txId, reset } = useTransfer();

// Send 10 HBAR to 0.0.9999
const id = await transfer('0.0.9999', 10);
console.log('Transaction ID:', id); // e.g. "0.0.1234567@1711234567.000000001"
```

**`transfer(toAccountId, amountHbar)`**
- `toAccountId` — destination account in `0.0.XXXXX` format.
- `amountHbar` — amount in whole HBAR units (not tinybars).
- Returns the transaction ID string on success, or `null` on failure.

**Returned values:**
- `txId` — last successful transaction ID.
- `loading` — `true` while the wallet is signing/submitting.
- `error` — error message or `null`.
- `reset` — clears `txId` and `error`.

**How it works:** Builds a `TransferTransaction` with manually-generated `TransactionId` and `NodeAccountIds`, signs it via `signer.signTransaction()`, then submits via `connector.executeTransaction()`. This two-step approach avoids issues with some wallets stripping transaction fields during `hedera_signAndExecuteTransaction`.

---

### useTokenCreate

Creates a new HTS token — either a Fungible token or an NFT collection.

```tsx
const { createToken, tokenId, supplyKeyHex, loading, error, reset } = useTokenCreate();

// Create a fungible token
const id = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  type: 'FUNGIBLE',
  initialSupply: 1_000_000,
  decimals: 2,
  memo: 'My first token',
});

// Create an NFT collection
const id = await createToken({
  name: 'My NFT Collection',
  symbol: 'MNFT',
  type: 'NFT',
  maxSupply: 10_000,
});
console.log('Supply key (save this!):', supplyKeyHex);
```

**`createToken(params)`**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Token name |
| `symbol` | `string` | Token symbol |
| `type` | `'FUNGIBLE' \| 'NFT'` | Token type |
| `initialSupply` | `number` | Initial supply for fungible tokens (whole units) |
| `decimals` | `number` | Decimal places for fungible tokens. Default: `2` |
| `maxSupply` | `number` | Maximum supply cap (sets `FINITE` supply type) |
| `memo` | `string` | Token memo |

**Returned values:**
- `tokenId` — created token ID (e.g. `0.0.9876543`).
- `supplyKeyHex` — **NFT only** — hex-encoded private supply key generated locally. **Store this securely** — it is required to mint NFTs on this collection later.
- `loading`, `error`, `reset` — standard async state.

**How it works:** For NFTs, a fresh ECDSA private key is generated locally in the browser. Its public key is set as the token's supply key, and the transaction is signed with it before the wallet counter-signs as treasury. The supply key private key is surfaced to the caller for safekeeping — it is never stored by the library.

---

### useTokenBurn

Burns HTS tokens — both fungible tokens and specific NFT serials.

```tsx
const { burnFungible, burnNFT, txId, loading, error, reset } = useTokenBurn();

// Burn 500 fungible tokens
await burnFungible('0.0.1234567', 500);

// Burn NFT serials 1, 2, and 5
await burnNFT('0.0.1234567', [1, 2, 5]);
```

**`burnFungible(tokenId, amount)`**
- `tokenId` — Hedera token ID.
- `amount` — amount to burn in whole units (library converts to raw using the token's decimals).
- Returns transaction ID or `null`.

**`burnNFT(tokenId, serials)`**
- `tokenId` — NFT collection token ID.
- `serials` — array of serial numbers to burn.
- Returns transaction ID or `null`.

**Note:** Burning requires that the connected wallet holds the token's supply key, or is the treasury account with supply key authority.

---

### useTokenAssociate

Associates or dissociates HTS tokens with the connected account. On Hedera, an account **must** associate a token before it can receive it — this hook handles that requirement cleanly.

```tsx
const { associate, dissociate, txId, loading, error, reset } = useTokenAssociate();

// Associate a single token
await associate('0.0.1234567');

// Associate multiple tokens at once
await associate(['0.0.111', '0.0.222', '0.0.333']);

// Dissociate a token (removes it from the account; balance must be zero)
await dissociate('0.0.1234567');
```

**`associate(tokenIds)`** / **`dissociate(tokenIds)`**
- `tokenIds` — a single token ID string, or an array of token ID strings.
- Returns transaction ID on success, or `null` on failure.

**Returned values:**
- `txId`, `loading`, `error`, `reset` — standard async state.

---

### useTokenBalance

Fetches the balance of a specific HTS token for an account.

```tsx
const { balance, loading, error, refetch } = useTokenBalance('0.0.1234567', '0.0.9999999');
```

**Parameters:**
- First argument — token ID.
- Second argument *(optional)* — account ID. Defaults to connected wallet.

**Returned values:**
- `balance` — token balance as a number (raw units, not adjusted for decimals).
- `loading`, `error`, `refetch` — standard async state.

---

### useTokenInfo

Fetches metadata for an HTS token from the Mirror Node.

```tsx
const { tokenInfo, loading, error, refetch } = useTokenInfo('0.0.1234567');

// tokenInfo shape:
// {
//   tokenId: string,
//   name: string,
//   symbol: string,
//   decimals: number,
//   totalSupply: number,
//   maxSupply: number | null,
//   type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE',
//   memo: string,
//   treasuryAccountId: string,
// }
```

---

### useNFT

Fetches NFTs owned by an account, or details about a specific NFT.

```tsx
const { nfts, loading, error, refetch } = useNFT('0.0.1234567');

// Each NFT:
// {
//   tokenId: string,
//   serialNumber: number,
//   metadata: string,   // base64-encoded metadata URI
//   accountId: string,
// }
```

**Parameters:**
- `accountId` *(optional)* — account to look up NFTs for. Defaults to connected wallet.

---

### useContractRead

Reads data from a deployed Hedera smart contract via JSON-RPC Relay (`eth_call`). No wallet connection required — pure read-only query.

```tsx
import { encodeFunctionData } from 'viem';

const callData = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'totalSupply',
});

const { data, loading, error, call } = useContractRead(
  '0xYourContractAddress',
  callData,
  { immediate: true, pollInterval: 10_000 }
);
```

**Parameters:**
- `contractEvmAddress` — EVM address of the contract (`0x...`).
- `encodedCallData` — ABI-encoded calldata. Use `viem` or `ethers` to encode.
- `options.immediate` — auto-fetch on mount. Default: `true`.
- `options.pollInterval` — polling interval in milliseconds. `0` = disabled.

**Returned values:**
- `data` — raw hex result string returned by the contract.
- `loading`, `error` — standard async state.
- `call` — manually trigger the call.

**How it works:** Sends a POST request to the Hedera JSON-RPC Relay (`https://testnet.hashio.io/api` for testnet) with an `eth_call` payload. The relay translates the EVM call to a native Hedera query.

---

### useContractWrite

Executes a state-changing function on a Hedera smart contract. Requires a connected wallet for signing.

```tsx
const { write, txId, loading, error, reset } = useContractWrite();

// Call a contract function
const id = await write({
  contractId: '0.0.12345',
  functionName: 'transfer',
  encodedParams: encodedBytes,  // ABI-encoded params (Uint8Array)
  gas: 80_000,
  payableAmount: 1,             // 1 HBAR attached to payable function
});
```

**`write(params)`**

| Field | Type | Description |
|-------|------|-------------|
| `contractId` | `string` | Hedera contract ID: `0.0.XXXXX` |
| `functionName` | `string` | Name of the contract function to call |
| `encodedParams` | `Uint8Array` | ABI-encoded function parameters. Use `viem`/`ethers` to encode. Optional for no-arg functions. |
| `gas` | `number` | Gas limit. Default: `100_000` |
| `payableAmount` | `number` | HBAR amount to attach to payable function calls |

**Returned values:**
- `txId` — transaction ID on success.
- `loading`, `error`, `reset` — standard async state.

---

### useHCS

Interacts with the Hedera Consensus Service (HCS). Submit messages to a topic and read them from the Mirror Node.

```tsx
const { submitMessage, fetchMessages, loading, error, lastSequenceNumber, reset } = useHCS();

// Submit a string message
await submitMessage('0.0.12345', 'Hello, Hedera!');

// Submit a JSON object (automatically serialized)
await submitMessage('0.0.12345', { event: 'CO2_OFFSET', kg: 42 });

// Read the last 10 messages from a topic
const messages = await fetchMessages('0.0.12345', 10);
// messages: Array<{ sequenceNumber, consensusTimestamp, content }>
```

**`submitMessage(topicId, payload)`**
- `topicId` — HCS topic ID in `0.0.XXXXX` format.
- `payload` — a string or any JSON-serialisable object. Objects are automatically passed through `JSON.stringify`.
- Returns the transaction ID on success, or `null` on failure.

**`fetchMessages(topicId, limit?)`**
- `topicId` — HCS topic ID.
- `limit` — maximum number of messages to return. Default: `25`. Messages are returned newest-first.
- Returns an array of `HCSMessage` objects:
  - `sequenceNumber` — monotonically increasing message index.
  - `consensusTimestamp` — ISO timestamp of when the message reached consensus.
  - `content` — decoded message content (base64-decoded from Mirror Node response).

**`lastSequenceNumber`** — transaction ID of the last submitted message (for tracking purposes).

---

### useStaking

Fetches staking information for an account and provides actions to stake to a network node or remove staking.

```tsx
const {
  stakingInfo,
  networkNodes,
  loading,
  error,
  refetch,
  stake,
  unstake,
} = useStaking();

// Stake to node 3
const txId = await stake(3);

// Remove staking
const txId = await unstake();
```

**Returned values:**

`stakingInfo` — current staking state for the account:
```ts
{
  stakedNodeId: number | null;     // node currently staked to
  stakedAccountId: string | null;  // account staked to (proxy staking)
  pendingReward: number;           // HBAR pending reward
  stakePeriodStart: string | null; // ISO timestamp of staking period start
  declineReward: boolean;          // whether rewards are declined
}
```

`networkNodes` — array of all active Hedera network nodes:
```ts
{
  nodeId: number;
  description: string;
  stake: number;      // total staked HBAR
  minStake: number;   // minimum stake threshold
  maxStake: number;   // maximum stake threshold
  rewardRate: number; // annualised reward rate
}
```

**`stake(nodeId)`**
- `nodeId` — the integer node ID to stake to.
- Builds an `AccountUpdateTransaction` with `setStakedNodeId(nodeId)` and submits it.
- Returns transaction ID or `null`.

**`unstake()`**
- Clears staking by setting `stakedNodeId` to `-1` (the Hedera sentinel value for "no staking").
- Returns transaction ID or `null`.

**Notes:**
- Network nodes are always fetched from the public Mirror Node — no wallet needed.
- Staking info is only fetched when an account ID is available.
- After a successful stake/unstake, local state is updated optimistically while the transaction propagates.

---

### useFileService

Creates and reads files on the Hedera File Service (HFS). Useful for storing metadata, configuration, or any content on-chain.

```tsx
const { createFile, appendFile, readFile, fileId, fileInfo, loading, error, reset } = useFileService();

// Create a new file
const id = await createFile('{"name":"metadata","version":"1.0"}', 'NFT metadata');
console.log('File ID:', id); // e.g. "0.0.9876543"

// Append more content to the file
await appendFile(id, 'additional content');

// Read file contents (only available for files created in this session)
const content = await readFile(id);
```

**`createFile(contents, memo?)`**
- `contents` — file contents as a UTF-8 string.
- `memo` *(optional)* — file memo.
- Returns the new file ID on success, or `null` on failure.
- Large files are automatically split into 4 KB chunks (`FileCreateTransaction` + multiple `FileAppendTransaction`s).

**`appendFile(fileId, contents)`**
- `fileId` — existing file ID to append to.
- `contents` — UTF-8 string content to append.
- Large content is chunked automatically.
- Returns the last transaction ID, or `null` on failure.

**`readFile(fileId)`**
- Returns the file's contents if they were cached from a `createFile` call in the same session.
- **Important:** HFS file contents cannot be read via the Mirror Node REST API, and the Hedera gRPC API is not available in browsers. As a result, `readFile` only works for files created in the current browser session.

**`fileId`** — ID of the most recently created file.
**`fileInfo`** — `{ fileId, size, contents, memo }` for the most recently created file.

---

### useScheduledTransaction

Creates and signs Hedera Scheduled Transactions — enabling multi-sig workflows where multiple parties must approve before execution.

```tsx
const {
  scheduleTransfer,
  signScheduled,
  fetchScheduleInfo,
  scheduleId,
  scheduleInfo,
  loading,
  error,
  reset,
} = useScheduledTransaction();

// Create a scheduled HBAR transfer requiring approval
const sid = await scheduleTransfer('0.0.9999', 100, 'Team payment Q1');
console.log('Schedule ID:', sid);

// Another party signs the schedule
await signScheduled(sid);

// Check schedule status
await fetchScheduleInfo(sid);
console.log(scheduleInfo?.executed);   // true once all required signatures collected
```

**`scheduleTransfer(toAccountId, amountHbar, memo?)`**
- Creates a `ScheduleCreateTransaction` wrapping a `TransferTransaction`.
- `toAccountId` — recipient account.
- `amountHbar` — amount in whole HBAR.
- `memo` *(optional)* — memo attached to the schedule.
- Returns the schedule ID (e.g. `0.0.9876543`) on success, retrieved from the Mirror Node after confirmation.

**`signScheduled(scheduleId)`**
- Signs an existing scheduled transaction with the connected wallet's key.
- When all required signatures are collected, Hedera automatically executes the scheduled transaction.
- Returns the signing transaction ID.

**`fetchScheduleInfo(scheduleId)`**
- Fetches schedule metadata from the Mirror Node.
- Populates `scheduleInfo`:

```ts
{
  scheduleId: string;
  memo: string;
  adminKey: string | null;
  payerAccountId: string;
  creatorAccountId: string;
  expirationTime: string;
  executed: boolean;           // true once executed
  deleted: boolean;            // true if deleted/expired
  signatories: string[];       // public key prefixes of signers
}
```

---

### useExchangeRate

Fetches the current HBAR/USD exchange rate from the Mirror Node.

```tsx
const { rate, loading, error, refetch } = useExchangeRate();
// rate — HBAR price in USD, e.g. 0.083
```

**Returned values:**
- `rate` — current HBAR price in USD as a number.
- `loading`, `error`, `refetch` — standard async state.

---

### useMirrorNode

Low-level hook for making arbitrary Mirror Node REST API requests. Useful for querying endpoints not covered by the specialised hooks.

```tsx
const { get, loading, error } = useMirrorNode();

const data = await get('/api/v1/tokens?type=FUNGIBLE_COMMON&limit=10');
```

**`get(path)`**
- Sends a GET request to the Mirror Node for the current network.
- `path` — API path relative to the Mirror Node base URL.
- Returns the parsed JSON response, or `null` on error.

---

### useTopicMessages

Subscribes to real-time messages from an HCS topic by polling the Mirror Node at a given interval.

```tsx
const { messages, loading, error } = useTopicMessages('0.0.12345', {
  limit: 20,
  pollInterval: 5_000,
});
```

**Parameters:**
- `topicId` — HCS topic to subscribe to.
- `options.limit` — number of messages to fetch per poll.
- `options.pollInterval` — poll interval in milliseconds.

**Returned values:**
- `messages` — array of `HCSMessage` objects, updated on each poll.
- `loading`, `error` — standard async state.

---

### useAIAgent

AI chat assistant powered by Groq (llama-3.3-70b-versatile). The agent understands Hedera context — it can check your balance, send HBAR, and answer questions about the network, all through natural language.

```tsx
const {
  messages,
  sendMessage,
  isLoading,
  clearMessages,
} = useAIAgent();

await sendMessage('What is my current balance?');
await sendMessage('Send 5 HBAR to 0.0.9999');
```

**`sendMessage(text)`**
- Sends a user message to the AI agent.
- The agent has access to `balance`, `accountId`, and `network` from context.
- For send/transfer requests, the agent runs a 3-step confirmation flow: it asks for the amount, then the recipient address, then asks the user to confirm before calling `transfer()`.
- For general Hedera questions, it calls the Groq API for a natural language response.

**`messages`** — array of `{ role: 'user' | 'assistant', content: string }` objects.

**`isLoading`** — `true` while waiting for the AI response.

**`clearMessages`** — resets the conversation history.

**Available AI actions:**
- `get_balance` — fetch current HBAR balance
- `transfer_hbar` — send HBAR to an account (requires explicit amount and recipient from the user)
- `get_account_info` — fetch full account information

---

## Components

### ConnectButton

A styled button that opens the WalletConnect modal when clicked, and shows the connected account ID when a wallet is connected.

```tsx
import { ConnectButton } from 'hedera-ui-kit';

<ConnectButton />
```

Shows "Connect Wallet" when disconnected. Shows the truncated account ID and a disconnect option when connected.

---

### AccountCard

Displays a summary card with the connected account's ID, HBAR balance, network, and EVM address.

```tsx
import { AccountCard } from 'hedera-ui-kit';

<AccountCard />
```

---

### HBARAmount

Formats and displays an HBAR amount with optional USD conversion.

```tsx
import { HBARAmount } from 'hedera-ui-kit';

<HBARAmount amount={123.456} showUsd />
```

**Props:**
- `amount` — HBAR amount as a number.
- `showUsd` *(optional)* — display the USD equivalent using the current exchange rate.

---

### HBARPriceWidget

Shows the current HBAR/USD price fetched live from the Mirror Node.

```tsx
import { HBARPriceWidget } from 'hedera-ui-kit';

<HBARPriceWidget />
```

---

### NetworkSwitcher

A dropdown that lets the user switch between testnet, mainnet, and previewnet.

```tsx
import { NetworkSwitcher } from 'hedera-ui-kit';

<NetworkSwitcher />
```

---

### TokenCard

Displays metadata and balance for a single HTS token.

```tsx
import { TokenCard } from 'hedera-ui-kit';

<TokenCard tokenId="0.0.1234567" />
```

**Props:**
- `tokenId` — Hedera token ID to display.

---

### TokenMintForm

A form component for minting NFTs into an existing collection. Requires the supply key (returned by `useTokenCreate`) to sign the mint transaction.

```tsx
import { TokenMintForm } from 'hedera-ui-kit';

<TokenMintForm
  tokenId="0.0.1234567"
  supplyKeyHex="your-supply-key-hex"
/>
```

**Props:**
- `tokenId` — NFT collection token ID.
- `supplyKeyHex` — hex-encoded private supply key from `useTokenCreate`.

---

### NFTGallery

Displays a grid of NFTs owned by an account, with metadata resolution.

```tsx
import { NFTGallery } from 'hedera-ui-kit';

<NFTGallery accountId="0.0.1234567" />
```

**Props:**
- `accountId` *(optional)* — account to show NFTs for. Defaults to connected wallet.

---

### TransactionStatus

Polls the Mirror Node and shows the real-time status of a transaction.

```tsx
import { TransactionStatus } from 'hedera-ui-kit';

<TransactionStatus txId="0.0.1234567@1711234567.000000001" />
```

**Props:**
- `txId` — transaction ID to track.

Shows a loading spinner while pending, a green checkmark on success, and an error state on failure.

---

### TransactionHistory

Lists recent transactions for an account in a scrollable table.

```tsx
import { TransactionHistory } from 'hedera-ui-kit';

<TransactionHistory accountId="0.0.1234567" limit={20} />
```

**Props:**
- `accountId` *(optional)* — defaults to connected wallet.
- `limit` *(optional)* — number of transactions. Default: `25`.

---

### StakingPanel

Full staking UI — shows current staking status, lists all network nodes with their stake and reward rate, and provides stake/unstake actions.

```tsx
import { StakingPanel } from 'hedera-ui-kit';

<StakingPanel />
```

Requires a connected wallet for staking/unstaking actions. Network node data is always displayed from the live Mirror Node.

---

### HCSLogger

A panel for submitting messages to an HCS topic and viewing the result.

```tsx
import { HCSLogger } from 'hedera-ui-kit';

<HCSLogger defaultTopicId="0.0.12345" />
```

**Props:**
- `defaultTopicId` *(optional)* — pre-fills the topic ID input.

---

### TopicMessageFeed

Displays a live, auto-refreshing feed of messages from an HCS topic.

```tsx
import { TopicMessageFeed } from 'hedera-ui-kit';

<TopicMessageFeed topicId="0.0.12345" pollInterval={5000} limit={20} />
```

**Props:**
- `topicId` — HCS topic to display.
- `pollInterval` *(optional)* — refresh interval in ms. Default: `5000`.
- `limit` *(optional)* — number of messages to show. Default: `25`.

---

### ContractCallButton

A button that executes a smart contract function when clicked, with loading and error state handling.

```tsx
import { ContractCallButton } from 'hedera-ui-kit';

<ContractCallButton
  contractId="0.0.12345"
  functionName="increment"
  label="Increment Counter"
  gas={60_000}
/>
```

**Props:**
- `contractId` — Hedera contract ID.
- `functionName` — contract function to call.
- `label` — button text.
- `encodedParams` *(optional)* — ABI-encoded function parameters.
- `gas` *(optional)* — gas limit.
- `payableAmount` *(optional)* — HBAR to attach.

---

### AIChat

A full-featured chat interface powered by `useAIAgent`. Renders a message list and text input, manages the conversation state, and handles the send HBAR confirmation flow.

```tsx
import { AIChat } from 'hedera-ui-kit';

<AIChat />
```

No props required. Connects automatically to the wallet context and Groq API.

---

## Demo Mode

Every hook and component supports a demo mode that simulates blockchain interactions without needing a real wallet or network connection. This is ideal for demos, testing, and development.

```tsx
<HederaProvider
  walletConnectProjectId=""
  demoMode={true}
>
  {children}
</HederaProvider>
```

In demo mode:
- Connect/disconnect immediately succeed with a fake account ID (`0.0.1234567`).
- Transactions return fake IDs after a short artificial delay (~1 second).
- Mirror Node reads return realistic fake data.
- No real HBAR is transferred.

The demo is automatically enabled in the live example at [hedera-ui-kit.vercel.app](https://hedera-ui-kit.vercel.app) when no `VITE_WALLETCONNECT_PROJECT_ID` is set.

---

## Network Configuration

The library supports all three Hedera networks. Switch networks at the provider level:

```tsx
<HederaProvider network="mainnet" walletConnectProjectId="...">
```

Or dynamically via the hook:

```tsx
const { setNetwork } = useHedera();
setNetwork('mainnet');
```

Mirror Node URLs used per network:

| Network | Mirror Node |
|---------|------------|
| testnet | `https://testnet.mirrornode.hedera.com` |
| mainnet | `https://mainnet-public.mirrornode.hedera.com` |
| previewnet | `https://previewnet.mirrornode.hedera.com` |

JSON-RPC Relay URLs (for contract reads):

| Network | JSON-RPC Relay |
|---------|---------------|
| testnet | `https://testnet.hashio.io/api` |
| mainnet | `https://mainnet.hashio.io/api` |
| previewnet | `https://previewnet.hashio.io/api` |

---

## Architecture Notes

### Two-step Sign + Execute Pattern

All write transactions use a two-step pattern to avoid issues with WalletConnect wallets:

```ts
// Step 1: wallet signs the transaction body
const fullySigned = await signer.signTransaction(frozenTx);

// Step 2: submit pre-signed bytes as-is
await connector.executeTransaction({
  signedTransaction: [transactionToBase64String(fullySigned)],
});
```

This is necessary because `hedera_signAndExecuteTransaction` can cause some wallets to re-build the transaction, stripping manually-set fields like `nodeAccountIds` and `transactionId`. The two-step approach preserves all fields.

### Manual Transaction Preparation

Every transaction is manually prepared before signing:

```ts
tx.setTransactionId(TransactionId.generate(AccountId.fromString(accountId)));
tx.setNodeAccountIds(['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'].map(AccountId.fromString));
const frozenTx = tx.freeze();
```

This is required because `DAppSigner.populateTransaction()` only sets the transaction ID and never sets node account IDs, making network submission fail.

### Mirror Node Polling

Because gRPC is not available in browsers, transactions are confirmed by polling the Mirror Node:

```
GET /api/v1/transactions/{mirrorTxId}
```

The SDK transaction ID format `0.0.123@1234567890.123456789` is converted to Mirror Node format `0.0.123-1234567890-123456789` before querying.

For transactions that create entities (tokens, files, schedules), the `entity_id` field in the Mirror Node response is used to retrieve the created ID.

---

## Contributing

Contributions are welcome! Please open an issue or pull request at [github.com/Alicepoltora/hedera-tools](https://github.com/Alicepoltora/hedera-tools).

---

## License

MIT © [Alice Poltora](https://github.com/Alicepoltora)

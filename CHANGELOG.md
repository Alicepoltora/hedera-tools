# Changelog

All notable changes to hedera-ui-kit are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-03-21

### Added

**Hooks**
- `useHedera()` — wallet state, connect/disconnect, demoMode
- `useTransfer()` — HBAR transfer via HashPack wallet
- `useHCS()` — submit and read Hedera Consensus Service messages
- `useMirrorNode()` — generic Mirror Node REST API query with polling
- `useTokenBalance()` — HTS token balance for any account
- `useAccountInfo()` — full account info (EVM address, tokens, staking)
- `useNFT()` — NFT metadata, collections, account ownership
- `useStaking()` — staking info and network nodes list
- `useContractRead()` — `eth_call` via HashIO JSON-RPC Relay (no wallet)
- `useContractWrite()` — `ContractExecuteTransaction` via wallet signer
- `useTokenAssociate()` — associate/dissociate HTS tokens

**Components**
- `<HederaProvider />` — React context with DAppConnector, network switching, demoMode
- `<ConnectButton />` — HashPack connect/disconnect button with optional balance display
- `<NetworkSwitcher />` — dropdown and pills variant for testnet/mainnet/previewnet
- `<HBARAmount />` — HBAR formatter with optional live USD price (CoinGecko, 5-min cache)
- `<TokenMintForm />` — create HTS fungible token in one form
- `<HCSLogger />` — submit messages + live feed from Mirror Node
- `<TransactionStatus />` — live transaction polling with HashScan explorer link
- `<TokenCard />` — token metadata card with skeleton loader

**Developer Experience**
- Full TypeScript types and `.d.ts` declarations
- `demoMode` — simulate all blockchain interactions without a real wallet
- JSDoc on all hooks and component props (shows in IDE hover)
- Tree-shakeable ESM + CommonJS dual build

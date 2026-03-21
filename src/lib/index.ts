// ─────────────────────────────────────────────────────────────────────────────
// hedera-ui-kit — Public API
// ─────────────────────────────────────────────────────────────────────────────

// ── Context / Provider ────────────────────────────────────────────────────────
export { HederaProvider } from './context/HederaProvider';
export type {
  HederaProviderProps,
  HederaNetwork,
  HederaContextState,
} from './context/HederaProvider';

// ── Core Hooks ────────────────────────────────────────────────────────────────
export { useHedera } from './hooks/useHedera';

export { useTransfer } from './hooks/useTransfer';
export type { TransferResult } from './hooks/useTransfer';

export { useHCS } from './hooks/useHCS';
export type { UseHCSResult, HCSMessage } from './hooks/useHCS';

// ── Mirror Node Hooks ──────────────────────────────────────────────────────────
export { useMirrorNode } from './hooks/useMirrorNode';
export type { UseMirrorNodeResult, UseMirrorNodeOptions } from './hooks/useMirrorNode';

export { useTokenBalance } from './hooks/useTokenBalance';
export type { TokenBalance, UseTokenBalanceResult } from './hooks/useTokenBalance';

export { useAccountInfo } from './hooks/useAccountInfo';
export type { AccountInfo, UseAccountInfoResult } from './hooks/useAccountInfo';

export { useNFT } from './hooks/useNFT';
export type { NFTMetadata, NFTCollection, UseNFTResult } from './hooks/useNFT';

export { useStaking } from './hooks/useStaking';
export type { StakingInfo, NetworkNode, UseStakingResult } from './hooks/useStaking';

// ── Smart Contract Hooks ───────────────────────────────────────────────────────
export { useContractRead } from './hooks/useContractRead';
export type { UseContractReadResult, UseContractReadOptions } from './hooks/useContractRead';

export { useContractWrite } from './hooks/useContractWrite';
export type { ContractWriteResult, ContractWriteParams } from './hooks/useContractWrite';

export { useTokenAssociate } from './hooks/useTokenAssociate';
export type { UseTokenAssociateResult } from './hooks/useTokenAssociate';

// ── Components ────────────────────────────────────────────────────────────────
export { ConnectButton } from './components/ConnectButton';
export type { ConnectButtonProps } from './components/ConnectButton';

export { TokenMintForm } from './components/TokenMintForm';
export type { TokenMintFormProps, TokenMintResult } from './components/TokenMintForm';

export { HCSLogger } from './components/HCSLogger';
export type { HCSLoggerProps } from './components/HCSLogger';

export { NetworkSwitcher } from './components/NetworkSwitcher';
export type { NetworkSwitcherProps } from './components/NetworkSwitcher';

export { TransactionStatus } from './components/TransactionStatus';
export type { TransactionStatusProps, TransactionRecord } from './components/TransactionStatus';

export { HBARAmount } from './components/HBARAmount';
export type { HBARAmountProps } from './components/HBARAmount';

export { TokenCard } from './components/TokenCard';
export type { TokenCardProps, TokenInfo } from './components/TokenCard';

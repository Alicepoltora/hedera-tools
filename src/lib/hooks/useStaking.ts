import { useCallback, useEffect, useState } from 'react';
import {
  AccountUpdateTransaction,
  AccountId,
  TransactionId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { useHedera } from './useHedera';

export interface StakingInfo {
  stakedNodeId: number | null;
  stakedAccountId: string | null;
  pendingReward: number; // HBAR
  stakePeriodStart: string | null;
  declineReward: boolean;
}

export interface NetworkNode {
  nodeId: number;
  description: string;
  stake: number; // HBAR
  minStake: number;
  maxStake: number;
  rewardRate: number; // annualised %
}

export interface UseStakingResult {
  stakingInfo: StakingInfo | null;
  networkNodes: NetworkNode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Stake to a network node by nodeId */
  stake: (nodeId: number) => Promise<string | null>;
  /** Remove staking from the current node */
  unstake: () => Promise<string | null>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];
const DEMO_DELAY = 1200;

const DEMO_STAKING: StakingInfo = {
  stakedNodeId: 3,
  stakedAccountId: null,
  pendingReward: 0.42,
  stakePeriodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
  declineReward: false,
};

const DEMO_NODES: NetworkNode[] = [
  { nodeId: 0, description: 'Hedera Node 0', stake: 5_000_000, minStake: 100, maxStake: 50_000_000, rewardRate: 6.5 },
  { nodeId: 3, description: 'Hedera Node 3', stake: 4_200_000, minStake: 100, maxStake: 50_000_000, rewardRate: 6.5 },
  { nodeId: 5, description: 'Hedera Node 5', stake: 3_800_000, minStake: 100, maxStake: 50_000_000, rewardRate: 6.5 },
];

/**
 * Hook for Hedera staking info — pending rewards, staked node, and network nodes.
 *
 * @example
 * const { stakingInfo, networkNodes, stake, unstake } = useStaking();
 * await stake(3);    // stake to node 3
 * await unstake();   // remove staking
 */
export function useStaking(accountId?: string): UseStakingResult {
  const {
    accountId: connectedId,
    signer,
    connector,
    isConnected,
    demoMode,
    network,
  } = useHedera();
  const target = accountId ?? connectedId;

  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const refetch = useCallback(async () => {
    if (demoMode) {
      setStakingInfo(DEMO_STAKING);
      setNetworkNodes(DEMO_NODES);
      return;
    }
    if (!target) return;

    setLoading(true);
    setError(null);

    try {
      const [accRes, nodesRes] = await Promise.all([
        fetch(`${mirror}/api/v1/accounts/${target}`),
        fetch(`${mirror}/api/v1/network/nodes?limit=25&order=asc`),
      ]);

      if (!accRes.ok) throw new Error(`Account not found: ${target}`);

      const acc = await accRes.json();
      const nodesData = nodesRes.ok ? await nodesRes.json() : { nodes: [] };

      setStakingInfo({
        stakedNodeId: acc.staked_node_id ?? null,
        stakedAccountId: acc.staked_account_id ?? null,
        pendingReward: (acc.pending_reward ?? 0) / 1e8,
        stakePeriodStart: acc.stake_period_start ?? null,
        declineReward: acc.decline_reward ?? false,
      });

      setNetworkNodes(
        (nodesData.nodes ?? []).map((n: Record<string, unknown>) => ({
          nodeId: n.node_id as number,
          description: (n.description as string) ?? `Node ${n.node_id}`,
          stake: Number((n.stake as string | number) ?? 0) / 1e8,
          minStake: Number((n.min_stake as string | number) ?? 0) / 1e8,
          maxStake: Number((n.max_stake as string | number) ?? 0) / 1e8,
          rewardRate: Number((n.reward_rate_start as string | number) ?? 0),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking info');
    } finally {
      setLoading(false);
    }
  }, [target, demoMode, mirror]);

  useEffect(() => { void refetch(); }, [refetch]);

  // ── stake: AccountUpdateTransaction with stakedNodeId ──────────────────────
  const stake = useCallback(
    async (nodeId: number): Promise<string | null> => {
      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        setStakingInfo((prev) => prev ? { ...prev, stakedNodeId: nodeId } : prev);
        setLoading(false);
        return `demo-stake-${nodeId}`;
      }

      if (!isConnected || !connectedId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const tx = new AccountUpdateTransaction()
          .setAccountId(AccountId.fromString(connectedId))
          .setStakedNodeId(nodeId)
          .setTransactionId(TransactionId.generate(AccountId.fromString(connectedId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const txIdStr = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        // Optimistically update local state
        setStakingInfo((prev) => prev ? { ...prev, stakedNodeId: nodeId } : prev);
        return txIdStr;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stake failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, connectedId, isConnected, demoMode]
  );

  // ── unstake: clear stakedNodeId by setting it to -1 ───────────────────────
  const unstake = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      await new Promise((r) => setTimeout(r, DEMO_DELAY));
      setStakingInfo((prev) => prev ? { ...prev, stakedNodeId: null } : prev);
      setLoading(false);
      return 'demo-unstake';
    }

    if (!isConnected || !connectedId) {
      setError('Wallet not connected');
      setLoading(false);
      return null;
    }

    try {
      if (!signer) throw new Error('Wallet signer not available');
      if (!connector) throw new Error('WalletConnect connector not available');

      // Setting stakedNodeId to -1 clears staking on Hedera
      const tx = new AccountUpdateTransaction()
        .setAccountId(AccountId.fromString(connectedId))
        .setStakedNodeId(-1)
        .setTransactionId(TransactionId.generate(AccountId.fromString(connectedId)))
        .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

      const frozenTx = tx.freeze();
      const txIdStr = frozenTx.transactionId!.toString();

      const fullySigned = await signer.signTransaction(frozenTx);
      await connector.executeTransaction({
        signedTransaction: [transactionToBase64String(fullySigned)],
      });

      setStakingInfo((prev) => prev ? { ...prev, stakedNodeId: null } : prev);
      return txIdStr;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unstake failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [signer, connector, connectedId, isConnected, demoMode]);

  return { stakingInfo, networkNodes, loading, error, refetch, stake, unstake };
}

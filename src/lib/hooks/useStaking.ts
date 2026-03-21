import { useCallback, useEffect, useState } from 'react';
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
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

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
 * const { stakingInfo, networkNodes } = useStaking();
 * console.log(stakingInfo?.pendingReward);
 */
export function useStaking(accountId?: string): UseStakingResult {
  const { accountId: connectedId, demoMode, network } = useHedera();
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

  return { stakingInfo, networkNodes, loading, error, refetch };
}

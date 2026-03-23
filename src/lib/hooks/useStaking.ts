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
    network,
  } = useHedera();
  const target = accountId ?? connectedId;

  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Network nodes are public — always fetch real data, no wallet needed
      const nodesRes = await fetch(`${mirror}/api/v1/network/nodes?limit=25&order=asc`);
      const nodesData = nodesRes.ok ? await nodesRes.json() : { nodes: [] };

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

      // Staking info requires a connected account
      if (target) {
        const accRes = await fetch(`${mirror}/api/v1/accounts/${target}`);
        if (!accRes.ok) throw new Error(`Account not found: ${target}`);
        const acc = await accRes.json();
        setStakingInfo({
          stakedNodeId: acc.staked_node_id ?? null,
          stakedAccountId: acc.staked_account_id ?? null,
          pendingReward: (acc.pending_reward ?? 0) / 1e8,
          stakePeriodStart: acc.stake_period_start ?? null,
          declineReward: acc.decline_reward ?? false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking info');
    } finally {
      setLoading(false);
    }
  }, [target, mirror]);

  useEffect(() => { void refetch(); }, [refetch]);

  // ── stake: AccountUpdateTransaction with stakedNodeId ──────────────────────
  const stake = useCallback(
    async (nodeId: number): Promise<string | null> => {
      setLoading(true);
      setError(null);

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
    [signer, connector, connectedId, isConnected]
  );

  // ── unstake: clear stakedNodeId by setting it to -1 ───────────────────────
  const unstake = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);

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
  }, [signer, connector, connectedId, isConnected]);

  return { stakingInfo, networkNodes, loading, error, refetch, stake, unstake };
}

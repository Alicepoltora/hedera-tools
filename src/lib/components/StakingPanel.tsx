import { useStaking, type NetworkNode } from '../hooks/useStaking';
import { useHedera } from '../hooks/useHedera';

export interface StakingPanelProps {
  className?: string;
}

function NodeRow({
  node,
  isStaked,
}: {
  node: NetworkNode;
  isStaked: boolean;
}) {
  const fillPct = node.stake > 0 && node.maxStake > 0
    ? Math.min(100, (node.stake / node.maxStake) * 100)
    : 0;

  return (
    <div
      className={`
        rounded-xl p-3.5 border transition-colors
        ${isStaked
          ? 'bg-violet-950/30 border-violet-600/40'
          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{node.description}</span>
            {isStaked && (
              <span className="text-xs bg-violet-600/30 text-violet-300 border border-violet-600/30 px-1.5 py-0.5 rounded">
                Staked here
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">Node {node.nodeId}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono text-emerald-400">
            {node.rewardRate > 0 ? `~${node.rewardRate.toFixed(1)}% APR` : '—'}
          </p>
        </div>
      </div>

      {/* Stake fill bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{node.stake.toLocaleString()} ℏ staked</span>
          <span>{fillPct.toFixed(0)}% full</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Panel showing current staking status, pending rewards, and network nodes.
 *
 * @example
 * <StakingPanel />
 */
export function StakingPanel({ className = '' }: StakingPanelProps) {
  const { accountId } = useHedera();
  const { stakingInfo, networkNodes, loading, error, refetch } = useStaking();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Staking</h3>
        <button
          onClick={() => void refetch()}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/20 border border-red-800/30 p-3">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Current staking info */}
      {loading ? (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-40" />
          <div className="h-8 bg-slate-700 rounded w-28" />
          <div className="h-3 bg-slate-700 rounded w-36" />
        </div>
      ) : stakingInfo ? (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-3">Your Staking Status</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Staked To</p>
              <p className="text-sm font-mono text-white">
                {stakingInfo.stakedNodeId !== null
                  ? `Node ${stakingInfo.stakedNodeId}`
                  : stakingInfo.stakedAccountId ?? 'None'}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Pending Reward</p>
              <p className="text-sm font-mono text-emerald-400">
                {stakingInfo.pendingReward.toFixed(4)} ℏ
              </p>
            </div>
            {stakingInfo.stakePeriodStart && (
              <div className="bg-slate-800/60 rounded-lg p-3 col-span-2">
                <p className="text-xs text-slate-500 mb-0.5">Staking Since</p>
                <p className="text-sm text-slate-300">
                  {new Date(stakingInfo.stakePeriodStart).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {stakingInfo.declineReward && (
            <p className="mt-3 text-xs text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded px-2.5 py-1.5">
              ⚠️ This account has opted out of staking rewards
            </p>
          )}
        </div>
      ) : accountId ? null : (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center">
          <p className="text-slate-500 text-sm">Connect wallet to see staking info</p>
        </div>
      )}

      {/* Network nodes */}
      {networkNodes.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-medium">
            Network Nodes
          </p>
          <div className="space-y-2">
            {networkNodes.map((node) => (
              <NodeRow
                key={node.nodeId}
                node={node}
                isStaked={stakingInfo?.stakedNodeId === node.nodeId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

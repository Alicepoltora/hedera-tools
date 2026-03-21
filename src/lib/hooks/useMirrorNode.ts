import { useCallback, useEffect, useRef, useState } from 'react';
import { useHedera } from './useHedera';

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

export interface UseMirrorNodeOptions {
  /** Auto-fetch on mount. Default: true */
  immediate?: boolean;
  /** Poll interval in ms. 0 = disabled */
  pollInterval?: number;
}

export interface UseMirrorNodeResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mirrorBaseUrl: string;
}

/**
 * Base hook for querying the Hedera Mirror Node REST API.
 * All other Mirror Node hooks are built on top of this.
 *
 * @example
 * const { data } = useMirrorNode<{ balances: ... }>('/api/v1/balances?account.id=0.0.1234');
 */
export function useMirrorNode<T = unknown>(
  endpoint: string,
  options: UseMirrorNodeOptions = {}
): UseMirrorNodeResult<T> {
  const { immediate = true, pollInterval = 0 } = options;
  const { network, demoMode } = useHedera();
  const mirrorBaseUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    if (!endpoint) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${mirrorBaseUrl}${endpoint}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Mirror Node ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setData(json as T);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, [endpoint, mirrorBaseUrl]);

  useEffect(() => {
    if (demoMode || !immediate) return;
    void refetch();
  }, [refetch, demoMode, immediate]);

  useEffect(() => {
    if (demoMode || !pollInterval) return;
    const id = setInterval(() => void refetch(), pollInterval);
    return () => clearInterval(id);
  }, [refetch, demoMode, pollInterval]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, loading, error, refetch, mirrorBaseUrl };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHedera } from './useHedera';

export interface TopicMessage {
  consensusTimestamp: string;
  sequenceNumber: number;
  message: string; // base64-encoded
  messageDecoded: string; // UTF-8 decoded
  runningHash: string;
  topicId: string;
  chunkInfo: {
    number: number;
    total: number;
  } | null;
}

export interface UseTopicMessagesOptions {
  /** Auto-start polling on mount. Default: true */
  autoStart?: boolean;
  /** Polling interval in ms. Default: 5000 */
  pollInterval?: number;
  /** Max messages to keep in memory. Default: 100 */
  maxMessages?: number;
  /** Only fetch messages after this timestamp (Unix ns) */
  sequenceNumberGte?: number;
}

export interface UseTopicMessagesResult {
  messages: TopicMessage[];
  loading: boolean;
  error: string | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  clearMessages: () => void;
  refetch: () => Promise<void>;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_MESSAGES: TopicMessage[] = [
  {
    consensusTimestamp: new Date(Date.now() - 3000).toISOString(),
    sequenceNumber: 3,
    message: btoa(JSON.stringify({ event: 'transfer', amount: 500 })),
    messageDecoded: JSON.stringify({ event: 'transfer', amount: 500 }),
    runningHash: '0x1a2b3c...',
    topicId: '0.0.9999999',
    chunkInfo: null,
  },
  {
    consensusTimestamp: new Date(Date.now() - 8000).toISOString(),
    sequenceNumber: 2,
    message: btoa(JSON.stringify({ event: 'mint', tokenId: '0.0.123' })),
    messageDecoded: JSON.stringify({ event: 'mint', tokenId: '0.0.123' }),
    runningHash: '0x4d5e6f...',
    topicId: '0.0.9999999',
    chunkInfo: null,
  },
  {
    consensusTimestamp: new Date(Date.now() - 20000).toISOString(),
    sequenceNumber: 1,
    message: btoa('Hello HCS!'),
    messageDecoded: 'Hello HCS!',
    runningHash: '0x7a8b9c...',
    topicId: '0.0.9999999',
    chunkInfo: null,
  },
];

/**
 * Hook for reading messages from a Hedera Consensus Service (HCS) topic.
 * Supports live polling for real-time message feeds.
 *
 * @example
 * const { messages, isPolling, startPolling } = useTopicMessages('0.0.9999999');
 */
export function useTopicMessages(
  topicId: string,
  options: UseTopicMessagesOptions = {}
): UseTopicMessagesResult {
  const { autoStart = true, pollInterval = 5000, maxMessages = 100, sequenceNumberGte } = options;
  const { demoMode, network } = useHedera();

  const [messages, setMessages] = useState<TopicMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const lastSeqRef = useRef<number>(sequenceNumberGte ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mirror = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;

  const parseMessage = (raw: Record<string, unknown>): TopicMessage => {
    const msg = (raw.message as string) ?? '';
    let decoded = '';
    try { decoded = atob(msg); } catch { decoded = msg; }
    return {
      consensusTimestamp: raw.consensus_timestamp as string,
      sequenceNumber: raw.sequence_number as number,
      message: msg,
      messageDecoded: decoded,
      runningHash: (raw.running_hash as string) ?? '',
      topicId: (raw.topic_id as string) ?? topicId,
      chunkInfo: raw.chunk_info
        ? {
            number: (raw.chunk_info as Record<string, number>).number,
            total: (raw.chunk_info as Record<string, number>).total,
          }
        : null,
    };
  };

  const refetch = useCallback(async () => {
    if (!topicId) return;

    if (demoMode) {
      setMessages(DEMO_MESSAGES);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const seqParam = lastSeqRef.current > 0 ? `&sequencenumber=gt:${lastSeqRef.current}` : '';
      const res = await fetch(
        `${mirror}/api/v1/topics/${topicId}/messages?limit=25&order=desc${seqParam}`
      );
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Topic ${topicId} not found`);
        throw new Error(`Mirror Node ${res.status}`);
      }
      const data = await res.json();
      const parsed: TopicMessage[] = (data.messages ?? []).map(parseMessage);

      if (parsed.length > 0) {
        lastSeqRef.current = Math.max(...parsed.map((m) => m.sequenceNumber));
        setMessages((prev) => {
          const combined = [...parsed, ...prev];
          const unique = Array.from(new Map(combined.map((m) => [m.sequenceNumber, m])).values());
          return unique
            .sort((a, b) => b.sequenceNumber - a.sequenceNumber)
            .slice(0, maxMessages);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [topicId, demoMode, mirror, maxMessages]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    void refetch();
    intervalRef.current = setInterval(() => void refetch(), pollInterval);
    setIsPolling(true);
  }, [refetch, pollInterval, stopPolling]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    lastSeqRef.current = 0;
  }, []);

  useEffect(() => {
    if (autoStart && topicId) startPolling();
    return () => stopPolling();
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { messages, loading, error, isPolling, startPolling, stopPolling, clearMessages, refetch };
}

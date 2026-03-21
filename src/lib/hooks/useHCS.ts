import { useCallback, useState } from 'react';
import { TopicMessageSubmitTransaction } from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export interface HCSMessage {
  sequenceNumber: number;
  consensusTimestamp: string;
  content: string;
}

export interface UseHCSResult {
  submitMessage: (topicId: string, payload: string | object) => Promise<string | null>;
  fetchMessages: (topicId: string, limit?: number) => Promise<HCSMessage[]>;
  loading: boolean;
  error: string | null;
  lastSequenceNumber: string | null;
  reset: () => void;
}

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const DEMO_DELAY = 1000;

/**
 * Hook for interacting with the Hedera Consensus Service (HCS).
 * Submit messages to a topic and read them from the Mirror Node.
 *
 * @example
 * const { submitMessage, fetchMessages, loading } = useHCS();
 * await submitMessage('0.0.12345', { event: 'CO2_OFFSET', kg: 42 });
 * const msgs = await fetchMessages('0.0.12345', 10);
 */
export function useHCS(): UseHCSResult {
  const { signer, accountId, isConnected, demoMode, network } = useHedera();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSequenceNumber, setLastSequenceNumber] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLastSequenceNumber(null);
  }, []);

  const submitMessage = useCallback(
    async (topicId: string, payload: string | object): Promise<string | null> => {
      if (!isConnected || !accountId) {
        setError('Wallet not connected.');
        return null;
      }

      setLoading(true);
      setError(null);

      const message =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      // ── Demo mode ──
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeSeq = String(Math.floor(Math.random() * 9000) + 1000);
        setLastSequenceNumber(fakeSeq);
        setLoading(false);
        return fakeSeq;
      }

      // ── Real mode ──
      try {
        if (!signer) throw new Error('Wallet signer not available');

        const tx = await new TopicMessageSubmitTransaction()
          .setTopicId(topicId)
          .setMessage(message)
          .freezeWithSigner(signer);

        const response = await tx.executeWithSigner(signer);
        const receipt = await response.getReceiptWithSigner(signer);
        const seq = receipt.topicSequenceNumber?.toString() ?? null;
        setLastSequenceNumber(seq);
        return seq;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Submit failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, accountId, isConnected, demoMode]
  );

  const fetchMessages = useCallback(
    async (topicId: string, limit = 25): Promise<HCSMessage[]> => {
      // ── Demo mode — return fake messages ──
      if (demoMode) {
        return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
          sequenceNumber: 100 - i,
          consensusTimestamp: new Date(Date.now() - i * 60_000).toISOString(),
          content: JSON.stringify({
            event: ['CO2_OFFSET', 'ENERGY_SAVED', 'TREE_PLANTED'][i % 3],
            value: Math.round(Math.random() * 100),
            unit: 'kg',
          }),
        }));
      }

      const mirrorUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
      const url = `${mirrorUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Mirror Node error: ${res.status}`);
        const data = await res.json();

        return (data.messages ?? []).map(
          (m: { sequence_number: number; consensus_timestamp: string; message: string }) => ({
            sequenceNumber: m.sequence_number,
            consensusTimestamp: m.consensus_timestamp,
            content: Buffer.from(m.message, 'base64').toString('utf-8'),
          })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        setError(msg);
        return [];
      }
    },
    [demoMode, network]
  );

  return { submitMessage, fetchMessages, loading, error, lastSequenceNumber, reset };
}

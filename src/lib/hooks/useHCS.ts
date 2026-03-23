import { useCallback, useState } from 'react';
import {
  TopicMessageSubmitTransaction,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
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
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

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
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSequenceNumber, setLastSequenceNumber] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLastSequenceNumber(null);
  }, []);

  const submitMessage = useCallback(
    async (topicId: string, payload: string | object): Promise<string | null> => {
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
      if (!isConnected || !accountId) {
        setError('Wallet not connected.');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const tx = new TopicMessageSubmitTransaction()
          .setTopicId(topicId)
          .setMessage(message)
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const txIdStr = frozenTx.transactionId!.toString();

        const fullySigned = await signer.signTransaction(frozenTx);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        // Poll Mirror Node to get sequence number from the confirmed message
        const mirrorUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
        const mirrorTxId = txIdStr.replace('@', '-').replace(/\.(\d+)$/, '-$1');
        let seq: string | null = null;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const res = await fetch(`${mirrorUrl}/api/v1/transactions/${mirrorTxId}`);
            if (!res.ok) continue;
            const data = await res.json();
            const txs: Array<{ result: string; entity_id?: string }> = data.transactions ?? [];
            if (txs.length > 0 && txs[0].result === 'SUCCESS') {
              // For HCS, return the txId — sequence number can be fetched via fetchMessages
              seq = txIdStr;
              break;
            }
          } catch {
            // retry
          }
        }

        setLastSequenceNumber(seq ?? txIdStr);
        return seq ?? txIdStr;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Submit failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
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
            content: (() => {
              try {
                return atob(m.message);
              } catch {
                return m.message;
              }
            })(),
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

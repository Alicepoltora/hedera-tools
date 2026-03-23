import { useCallback, useState } from 'react';
import {
  FileCreateTransaction,
  FileAppendTransaction,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { useHedera } from './useHedera';

export interface FileInfo {
  fileId: string;
  size: number;
  contents: string;
  memo: string;
}

export interface UseFileServiceResult {
  fileId: string | null;
  fileInfo: FileInfo | null;
  loading: boolean;
  error: string | null;
  /** Create a new file on Hedera File Service */
  createFile: (contents: string, memo?: string) => Promise<string | null>;
  /** Append data to an existing file */
  appendFile: (fileId: string, contents: string) => Promise<string | null>;
  /** Read file contents from the network */
  readFile: (fileId: string) => Promise<string | null>;
  reset: () => void;
}

const DEMO_DELAY = 1100;
const MAX_FILE_CHUNK = 4096; // bytes — HFS limit per transaction
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

const MIRROR_NODES: Record<string, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

// '0.0.123@1234567890.123456789' -> '0.0.123-1234567890-123456789'
function toMirrorTxId(txIdStr: string): string {
  return txIdStr.replace('@', '-').replace(/\.(\d+)$/, '-$1');
}

// Poll Mirror Node for entity_id (fileId) created by a transaction
async function waitForEntityId(txIdStr: string, mirrorUrl: string): Promise<string | null> {
  const mirrorId = toMirrorTxId(txIdStr);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`${mirrorUrl}/api/v1/transactions/${mirrorId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const txs: Array<{ result: string; entity_id?: string }> = data.transactions ?? [];
      if (txs.length > 0 && txs[0].result === 'SUCCESS') {
        return txs[0].entity_id ?? null;
      }
    } catch {
      // retry
    }
  }
  return null;
}

/**
 * Hook for Hedera File Service (HFS) — create, append, and read on-chain files.
 * Useful for storing metadata, configuration, or large content on Hedera.
 *
 * @example
 * const { createFile, readFile, fileId } = useFileService();
 * const id = await createFile('{"name":"metadata","version":"1.0"}', 'NFT metadata');
 * const content = await readFile(id);
 */
export function useFileService(): UseFileServiceResult {
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileId(null);
    setFileInfo(null);
    setError(null);
  }, []);

  const createFile = useCallback(
    async (contents: string, memo = ''): Promise<string | null> => {
      setLoading(true);
      setError(null);

      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`;
        setFileId(fakeId);
        setFileInfo({ fileId: fakeId, size: contents.length, contents, memo });
        setLoading(false);
        return fakeId;
      }

      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const mirrorUrl = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
        const encoder = new TextEncoder();
        const bytes = encoder.encode(contents);
        const firstChunk = bytes.slice(0, MAX_FILE_CHUNK);

        // Step 1: create the file (first chunk)
        const createTx = new FileCreateTransaction()
          .setContents(firstChunk)
          .setFileMemo(memo)
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenCreate = createTx.freeze();
        const createTxIdStr = frozenCreate.transactionId!.toString();

        const signedCreate = await signer.signTransaction(frozenCreate);
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(signedCreate)],
        });

        // Get fileId from Mirror Node entity_id
        const id = await waitForEntityId(createTxIdStr, mirrorUrl);
        if (!id) throw new Error('File creation timed out — no file ID returned');

        // Step 2: append remaining chunks if needed
        if (bytes.length > MAX_FILE_CHUNK) {
          let offset = MAX_FILE_CHUNK;
          while (offset < bytes.length) {
            const chunk = bytes.slice(offset, offset + MAX_FILE_CHUNK);
            const appendTx = new FileAppendTransaction()
              .setFileId(id)
              .setContents(chunk)
              .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
              .setNodeAccountIds(NODE_IDS.map((nodeId) => AccountId.fromString(nodeId)));

            const frozenAppend = appendTx.freeze();
            const signedAppend = await signer.signTransaction(frozenAppend);
            await connector.executeTransaction({
              signedTransaction: [transactionToBase64String(signedAppend)],
            });
            offset += MAX_FILE_CHUNK;
          }
        }

        setFileId(id);
        setFileInfo({ fileId: id, size: contents.length, contents, memo });
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File creation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
  );

  const appendFile = useCallback(
    async (fid: string, contents: string): Promise<string | null> => {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        return `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
      }

      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        const encoder = new TextEncoder();
        const bytes = encoder.encode(contents);
        let offset = 0;
        let lastTxId: string | null = null;

        while (offset < bytes.length) {
          const chunk = bytes.slice(offset, offset + MAX_FILE_CHUNK);
          const tx = new FileAppendTransaction()
            .setFileId(fid)
            .setContents(chunk)
            .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
            .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

          const frozenTx = tx.freeze();
          lastTxId = frozenTx.transactionId!.toString();

          const signed = await signer.signTransaction(frozenTx);
          await connector.executeTransaction({
            signedTransaction: [transactionToBase64String(signed)],
          });
          offset += MAX_FILE_CHUNK;
        }

        return lastTxId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Append failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode]
  );

  const readFile = useCallback(
    async (fid: string): Promise<string | null> => {
      if (demoMode) {
        const demo = '{"name":"Demo File","version":"1.0","createdWith":"hedera-ui-kit"}';
        setFileInfo({ fileId: fid, size: demo.length, contents: demo, memo: 'Demo file' });
        return demo;
      }

      // HFS file contents are not available via Mirror Node REST API.
      // Reading requires gRPC which is not supported in browsers.
      // As a workaround, return the cached contents if available (set during createFile).
      if (fileInfo?.fileId === fid && fileInfo.contents) {
        return fileInfo.contents;
      }

      setError('File contents reading requires gRPC (not supported in browser). Contents are available immediately after createFile().');
      return null;
    },
    [demoMode, fileInfo]
  );

  return { fileId, fileInfo, loading, error, createFile, appendFile, readFile, reset };
}

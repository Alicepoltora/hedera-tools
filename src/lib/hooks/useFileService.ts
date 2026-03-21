import { useCallback, useState } from 'react';
import {
  FileCreateTransaction,
  FileAppendTransaction,
  FileContentsQuery,
} from '@hiero-ledger/sdk';
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
  const { signer, isConnected, demoMode } = useHedera();
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
      if (!isConnected) { setError('Wallet not connected'); return null; }

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

      try {
        if (!signer) throw new Error('Wallet signer not available');

        const encoder = new TextEncoder();
        const bytes = encoder.encode(contents);

        // HFS: first chunk goes in FileCreateTransaction
        const firstChunk = bytes.slice(0, MAX_FILE_CHUNK);

        const createTx = await new FileCreateTransaction()
          .setContents(firstChunk)
          .setFileMemo(memo)
          .freezeWithSigner(signer);

        const createResp = await createTx.executeWithSigner(signer);
        const receipt = await createResp.getReceiptWithSigner(signer);
        const id = receipt.fileId?.toString();
        if (!id) throw new Error('No file ID in receipt');

        // Append remaining chunks
        if (bytes.length > MAX_FILE_CHUNK) {
          let offset = MAX_FILE_CHUNK;
          while (offset < bytes.length) {
            const chunk = bytes.slice(offset, offset + MAX_FILE_CHUNK);
            const appendTx = await new FileAppendTransaction()
              .setFileId(id)
              .setContents(chunk)
              .freezeWithSigner(signer);
            await (await appendTx.executeWithSigner(signer)).getReceiptWithSigner(signer);
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
    [signer, isConnected, demoMode]
  );

  const appendFile = useCallback(
    async (fid: string, contents: string): Promise<string | null> => {
      if (!isConnected) { setError('Wallet not connected'); return null; }
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        return `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
      }

      setLoading(true);
      setError(null);

      try {
        if (!signer) throw new Error('Wallet signer not available');
        const encoder = new TextEncoder();
        const bytes = encoder.encode(contents);
        let offset = 0;
        let lastTxId: string | null = null;

        while (offset < bytes.length) {
          const chunk = bytes.slice(offset, offset + MAX_FILE_CHUNK);
          const tx = await new FileAppendTransaction()
            .setFileId(fid)
            .setContents(chunk)
            .freezeWithSigner(signer);
          const resp = await tx.executeWithSigner(signer);
          lastTxId = resp.transactionId.toString();
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
    [signer, isConnected, demoMode]
  );

  const readFile = useCallback(
    async (fid: string): Promise<string | null> => {
      if (demoMode) {
        const demo = '{"name":"Demo File","version":"1.0","createdWith":"hedera-ui-kit"}';
        setFileInfo({ fileId: fid, size: demo.length, contents: demo, memo: 'Demo file' });
        return demo;
      }

      if (!signer) { setError('Wallet signer required to read files'); return null; }

      setLoading(true);
      setError(null);

      try {
        const contents = await new FileContentsQuery()
          .setFileId(fid)
          .executeWithSigner(signer);

        const decoder = new TextDecoder();
        const text = decoder.decode(contents);
        setFileInfo({ fileId: fid, size: text.length, contents: text, memo: '' });
        return text;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, demoMode]
  );

  return { fileId, fileInfo, loading, error, createFile, appendFile, readFile, reset };
}

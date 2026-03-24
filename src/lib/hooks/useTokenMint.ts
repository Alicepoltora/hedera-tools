import { useCallback, useState } from 'react';
import {
  TokenMintTransaction,
  TokenId,
  PrivateKey,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { useHedera } from './useHedera';

export interface TokenMintParams {
  /** HTS NFT collection token ID, e.g. "0.0.XXXXX" */
  tokenId: string;
  /** Raw hex of the supply private key (returned by useTokenCreate) */
  supplyKeyHex: string;
  /** Metadata strings (IPFS URIs or text) — one entry = one NFT serial minted */
  metadata: string[];
}

export interface UseTokenMintResult {
  /** Serial numbers of minted NFTs (from Mirror Node receipt) */
  serials: number[];
  txId: string | null;
  loading: boolean;
  error: string | null;
  mintNFT: (params: TokenMintParams) => Promise<number[] | null>;
  reset: () => void;
}

const DEMO_DELAY = 1300;
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

const MIRROR_NODES: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

function toMirrorTxId(txId: string): string {
  const [account, ts] = txId.split('@');
  return `${account}-${ts.replace('.', '-')}`;
}

/** Poll Mirror Node for serial numbers returned by a TokenMintTransaction. */
async function waitForMintReceipt(
  txId: string,
  network: string,
  maxWaitMs = 30_000,
  pollIntervalMs = 3_000
): Promise<number[]> {
  const base = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
  const mirrorId = toMirrorTxId(txId);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    try {
      const res = await fetch(`${base}/api/v1/transactions/${mirrorId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const tx = data.transactions?.[0];
      if (!tx) continue;
      if (tx.result === 'SUCCESS') {
        // serial numbers are in tx.nft_transfers or tx.token_transfers
        const serials: number[] = (tx.nft_transfers ?? []).map(
          (t: { serial_number: number }) => t.serial_number
        );
        return serials.length > 0 ? serials : [1];
      }
      if (tx.result && tx.result !== 'UNKNOWN') {
        throw new Error(`Mint failed: ${tx.result as string}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Mint failed')) throw err;
    }
  }
  throw new Error('Mint confirmation timed out.');
}

/**
 * Hook for minting NFT serials on an existing HTS NFT collection.
 * Requires the supply private key that was generated during token creation.
 *
 * @example
 * const { mintNFT, serials, txId } = useTokenMint();
 *
 * await mintNFT({
 *   tokenId: '0.0.XXXXX',
 *   supplyKeyHex: 'aabbcc...', // from useTokenCreate
 *   metadata: ['ipfs://QmYourHash'],
 * });
 * // serials → [1]
 */
export function useTokenMint(): UseTokenMintResult {
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();

  const [serials, setSerials] = useState<number[]>([]);
  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSerials([]);
    setTxId(null);
    setError(null);
  }, []);

  const mintNFT = useCallback(
    async (params: TokenMintParams): Promise<number[] | null> => {
      setLoading(true);
      setError(null);

      // ── Demo mode ──────────────────────────────────────────────────────────
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeSerials = params.metadata.map((_, i) => i + 1);
        setSerials(fakeSerials);
        const fakeId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
        setTxId(fakeId);
        setLoading(false);
        return fakeSerials;
      }

      // ── Real mode ──────────────────────────────────────────────────────────
      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');
        if (!connector) throw new Error('WalletConnect connector not available');

        // Reconstruct supply key from stored hex
        const supplyKey = PrivateKey.fromStringECDSA(params.supplyKeyHex);

        // Build metadata byte arrays (one per serial to mint)
        const metadataBytes = params.metadata.map((m) =>
          new TextEncoder().encode(m)
        );

        const tx = new TokenMintTransaction()
          .setTokenId(TokenId.fromString(params.tokenId))
          .setMetadata(metadataBytes)
          .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
          .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const txIdStr = frozenTx.transactionId!.toString();

        // Step 1: supply key signs (required for mint)
        const withSupplyKey = await frozenTx.sign(supplyKey);

        // Step 2: wallet signs as fee payer
        const fullySigned = await signer.signTransaction(withSupplyKey);

        // Step 3: submit via connector
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        // Poll Mirror Node for serial numbers
        const net = network ?? 'testnet';
        const mintedSerials = await waitForMintReceipt(txIdStr, net);

        setSerials(mintedSerials);
        setTxId(txIdStr);
        return mintedSerials;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'NFT mint failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
  );

  return { serials, txId, loading, error, mintNFT, reset };
}

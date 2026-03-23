import { useCallback, useState } from 'react';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TransactionId,
  AccountId,
  PublicKey,
} from '@hiero-ledger/sdk';
import { useHedera } from './useHedera';

export type TokenCreateType = 'FUNGIBLE' | 'NFT';

export interface TokenCreateParams {
  name: string;
  symbol: string;
  type: TokenCreateType;
  /** Initial supply for fungible tokens (in whole units) */
  initialSupply?: number;
  decimals?: number;
  maxSupply?: number;
  memo?: string;
}

export interface UseTokenCreateResult {
  tokenId: string | null;
  loading: boolean;
  error: string | null;
  createToken: (params: TokenCreateParams) => Promise<string | null>;
  reset: () => void;
}

const DEMO_DELAY = 1400;

const MIRROR_NODES: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

/**
 * Converts SDK transaction ID format to Mirror Node format.
 * "0.0.123@1234567890.123456789" → "0.0.123-1234567890-123456789"
 */
function toMirrorTxId(txId: string): string {
  const [account, ts] = txId.split('@');
  return `${account}-${ts.replace('.', '-')}`;
}

/**
 * Polls the Mirror Node until the transaction is confirmed.
 * Returns the created entity ID (token ID) on SUCCESS, or throws on failure.
 * Uses Mirror Node because gRPC (used by Client.getReceipt) is not available
 * in browser environments without a proxy.
 */
async function waitForMirrorReceipt(
  txId: string,
  network: string,
  maxWaitMs = 30_000,
  pollIntervalMs = 3_000
): Promise<string | null> {
  const base = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
  const mirrorId = toMirrorTxId(txId);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    try {
      const res = await fetch(`${base}/api/v1/transactions/${mirrorId}`);
      if (!res.ok) continue; // not yet indexed — keep polling
      const data = await res.json();
      const tx = data.transactions?.[0];
      if (!tx) continue;
      if (tx.result === 'SUCCESS') {
        return (tx.entity_id as string) ?? null;
      }
      if (tx.result && tx.result !== 'UNKNOWN') {
        throw new Error(`Transaction failed: ${tx.result as string}`);
      }
      // result is UNKNOWN or missing — keep polling
    } catch (err) {
      // Re-throw non-fetch errors (e.g. "Transaction failed: …")
      if (err instanceof Error && err.message.startsWith('Transaction failed')) {
        throw err;
      }
    }
  }
  throw new Error('Transaction confirmation timed out. Check your wallet for the status.');
}

/**
 * Fetches the account's public key from the Mirror Node.
 * Used to set the supply key on NFT token creation — Hedera requires a
 * supplyKey on NFTs. Using the user's own key means executeWithSigner
 * can also sign future mint transactions.
 */
async function fetchAccountPublicKey(
  accountId: string,
  network: string
): Promise<PublicKey | null> {
  try {
    const base = MIRROR_NODES[network] ?? MIRROR_NODES.testnet;
    const res = await fetch(`${base}/api/v1/accounts/${accountId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const keyHex: string | undefined = data?.key?.key;
    if (!keyHex) return null;
    return PublicKey.fromString(keyHex);
  } catch {
    return null;
  }
}

/**
 * Hook for creating new HTS tokens — both Fungible and NFT collections.
 *
 * @example
 * const { createToken, tokenId, loading } = useTokenCreate();
 * await createToken({ name: 'My Token', symbol: 'MTK', type: 'FUNGIBLE', initialSupply: 1000 });
 */
export function useTokenCreate(): UseTokenCreateResult {
  const { signer, accountId, isConnected, demoMode, network } = useHedera();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTokenId(null);
    setError(null);
  }, []);

  const createToken = useCallback(
    async (params: TokenCreateParams): Promise<string | null> => {
      setLoading(true);
      setError(null);

      // ── Demo mode ──
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`;
        setTokenId(fakeId);
        setLoading(false);
        return fakeId;
      }

      // ── Real mode ──
      if (!isConnected || !accountId) {
        setError('Wallet not connected');
        setLoading(false);
        return null;
      }

      try {
        if (!signer) throw new Error('Wallet signer not available');

        const isNFT = params.type === 'NFT';
        const net = network ?? 'testnet';

        // NFTs require a supplyKey — Hedera rejects creation without one at
        // precheck (TOKEN_HAS_NO_SUPPLY_KEY). We use the user's own public key
        // so that executeWithSigner(signer) can also authorize future mints.
        // The supplyKey does NOT need to sign the creation transaction itself.
        let supplyKey: PublicKey | null = null;
        if (isNFT) {
          supplyKey = await fetchAccountPublicKey(accountId, net);
          if (!supplyKey) {
            throw new Error(
              'Could not fetch your account public key for NFT supply key. Please try again.'
            );
          }
        }

        // Set nodeAccountIds and txId manually so freeze() works without a
        // client operator. Nodes 0.0.3–0.0.7 exist on both mainnet & testnet.
        const nodeIds = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

        // No adminKey — a randomly-generated key would need to co-sign the
        // creation transaction, which WalletConnect cannot provide.
        const tx = new TokenCreateTransaction()
          .setTokenName(params.name)
          .setTokenSymbol(params.symbol)
          .setTokenType(isNFT ? TokenType.NonFungibleUnique : TokenType.FungibleCommon)
          .setDecimals(isNFT ? 0 : (params.decimals ?? 2))
          .setInitialSupply(isNFT ? 0 : (params.initialSupply ?? 0))
          .setTreasuryAccountId(accountId)
          .setSupplyType(params.maxSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
          .setTokenMemo(params.memo ?? '');

        if (params.maxSupply) tx.setMaxSupply(params.maxSupply);
        if (supplyKey) tx.setSupplyKey(supplyKey);

        tx.setTransactionId(TransactionId.generate(AccountId.fromString(accountId)));
        tx.setNodeAccountIds(nodeIds.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const response = await frozenTx.executeWithSigner(signer);

        // getReceiptWithSigner(signer) is broken in DAppSigner (WalletConnect
        // throws "(BUG) Query.fromBytes() not implemented for type getByKey").
        // getReceipt(client) requires gRPC which is unavailable in browsers.
        // → Poll the Mirror Node REST API instead (standard browser pattern).
        const txIdStr = response.transactionId.toString();
        const id = await waitForMirrorReceipt(txIdStr, net);

        setTokenId(id);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token creation failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, accountId, isConnected, demoMode, network]
  );

  return { tokenId, loading, error, createToken, reset };
}

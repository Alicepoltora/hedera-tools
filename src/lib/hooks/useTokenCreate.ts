import { useCallback, useState } from 'react';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TransactionId,
  AccountId,
  PrivateKey,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
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
  /** For NFT tokens: the hex of the generated supply key private key.
   *  Store this — it is required to mint NFTs on this collection. */
  supplyKeyHex: string | null;
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
 * Converts SDK transaction ID format to Mirror Node URL format.
 * "0.0.123@1234567890.123456789" → "0.0.123-1234567890-123456789"
 */
function toMirrorTxId(txId: string): string {
  const [account, ts] = txId.split('@');
  return `${account}-${ts.replace('.', '-')}`;
}

/**
 * Polls the Mirror Node until the transaction is confirmed.
 * Returns the created entity ID on SUCCESS, throws on failure/timeout.
 * Uses Mirror Node because gRPC (Client.getReceipt) is unavailable in browsers.
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
      if (!res.ok) continue;
      const data = await res.json();
      const tx = data.transactions?.[0];
      if (!tx) continue;
      if (tx.result === 'SUCCESS') return (tx.entity_id as string) ?? null;
      if (tx.result && tx.result !== 'UNKNOWN') {
        throw new Error(`Transaction failed: ${tx.result as string}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Transaction failed')) throw err;
    }
  }
  throw new Error('Transaction confirmation timed out. Check your wallet for the status.');
}

/**
 * Hook for creating new HTS tokens — both Fungible and NFT collections.
 *
 * For NFT tokens a fresh supply key is generated locally. The private key hex
 * is returned in `supplyKeyHex` — store it, it is required to mint NFTs later.
 *
 * @example
 * const { createToken, tokenId, supplyKeyHex, loading } = useTokenCreate();
 * await createToken({ name: 'My Token', symbol: 'MTK', type: 'FUNGIBLE', initialSupply: 1000 });
 */
export function useTokenCreate(): UseTokenCreateResult {
  const { signer, connector, accountId, isConnected, demoMode, network } = useHedera();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [supplyKeyHex, setSupplyKeyHex] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTokenId(null);
    setSupplyKeyHex(null);
    setError(null);
  }, []);

  const createToken = useCallback(
    async (params: TokenCreateParams): Promise<string | null> => {
      setLoading(true);
      setError(null);
      setSupplyKeyHex(null);

      // ── Demo mode ──
      if (demoMode) {
        await new Promise((r) => setTimeout(r, DEMO_DELAY));
        const fakeId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`;
        setTokenId(fakeId);
        if (params.type === 'NFT') {
          setSupplyKeyHex('demo-supply-key-not-real');
        }
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

        // NFTs require a supplyKey — Hedera rejects creation at precheck without
        // one (TOKEN_HAS_NO_SUPPLY_KEY).
        //
        // Strategy: generate a fresh PrivateKey locally, use its public key as
        // the supplyKey, then sign the frozen transaction with it BEFORE handing
        // to executeWithSigner. The wallet only needs to sign as treasury.
        // The private key hex is surfaced in `supplyKeyHex` so the user can
        // store it for future mint operations.
        let supplyPrivateKey: PrivateKey | null = null;
        if (isNFT) {
          supplyPrivateKey = PrivateKey.generateECDSA();
        }

        // Set nodeAccountIds and txId manually — DAppSigner.populateTransaction
        // only sets txId, never nodeAccountIds; Client.forX() has no operator.
        const nodeIds = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

        // No adminKey — a randomly-generated admin key must co-sign creation,
        // which WalletConnect cannot provide.
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

        // Set the generated public key as the supply key on the token.
        if (supplyPrivateKey) {
          tx.setSupplyKey(supplyPrivateKey.publicKey);
        }

        tx.setTransactionId(TransactionId.generate(AccountId.fromString(accountId)));
        tx.setNodeAccountIds(nodeIds.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();

        // Capture txId now — we set it manually so we know it upfront.
        const txIdStr = frozenTx.transactionId!.toString();

        // Step 1: sign locally with the supply key (if NFT).
        const withSupplyKey = supplyPrivateKey
          ? await frozenTx.sign(supplyPrivateKey)
          : frozenTx;

        // Step 2: wallet signs as treasury via hedera_signTransaction.
        // This sends only the body bytes to the wallet for signing and merges
        // the returned signature into the existing signed transaction —
        // crucially it does NOT let the wallet re-build or strip any fields.
        const fullySigned = await signer.signTransaction(withSupplyKey);

        // Step 3: submit the pre-signed transaction via hedera_executeTransaction.
        // The wallet forwards the bytes as-is (no re-signing), so the supply key
        // field is preserved in what the Hedera node receives.
        if (!connector) throw new Error('WalletConnect connector not available');
        await connector.executeTransaction({
          signedTransaction: [transactionToBase64String(fullySigned)],
        });

        // Poll Mirror Node for confirmation (gRPC not available in browsers).
        const id = await waitForMirrorReceipt(txIdStr, net);

        setTokenId(id);
        if (supplyPrivateKey) {
          setSupplyKeyHex(supplyPrivateKey.toStringRaw());
        }
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token creation failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [signer, connector, accountId, isConnected, demoMode, network]
  );

  return { tokenId, supplyKeyHex, loading, error, createToken, reset };
}

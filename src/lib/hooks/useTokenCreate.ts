import { useCallback, useState } from 'react';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TransactionId,
  AccountId,
  Client,
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
 * Fetches the account's public key from the Mirror Node.
 * Used to set the supply key on NFT token creation (Hedera requires a supply
 * key on NFTs; using the user's own key lets them sign future mints via wallet).
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

        // For NFTs, Hedera requires a supplyKey — without it the token can never
        // be minted and creation is rejected at precheck (TOKEN_HAS_NO_SUPPLY_KEY).
        // We use the user's own public key so executeWithSigner(signer) can sign
        // future mint transactions too. It does NOT need to sign the create tx.
        let supplyKey: PublicKey | null = null;
        if (isNFT) {
          supplyKey = await fetchAccountPublicKey(accountId, net);
          if (!supplyKey) {
            throw new Error(
              'Could not fetch your account public key to set as NFT supply key. ' +
              'Please try again.'
            );
          }
        }

        // Nodes 0.0.3–0.0.7 are valid consensus nodes on both mainnet & testnet.
        const nodeIds = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

        // No adminKey — any randomly-generated key must also sign the creation
        // transaction, which WalletConnect cannot provide.
        const tx = new TokenCreateTransaction()
          .setTokenName(params.name)
          .setTokenSymbol(params.symbol)
          .setTokenType(isNFT ? TokenType.NonFungibleUnique : TokenType.FungibleCommon)
          .setDecimals(isNFT ? 0 : (params.decimals ?? 2))
          .setInitialSupply(isNFT ? 0 : (params.initialSupply ?? 0))
          .setTreasuryAccountId(accountId)
          .setSupplyType(params.maxSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
          .setTokenMemo(params.memo ?? '');

        if (params.maxSupply) {
          tx.setMaxSupply(params.maxSupply);
        }

        // supplyKey = user's wallet key → wallet signs mints automatically
        if (supplyKey) {
          tx.setSupplyKey(supplyKey);
        }

        // Set both txId and nodeAccountIds explicitly so freeze() succeeds
        // without needing a client with an operator.
        tx.setTransactionId(TransactionId.generate(AccountId.fromString(accountId)));
        tx.setNodeAccountIds(nodeIds.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const response = await frozenTx.executeWithSigner(signer);

        // getReceiptWithSigner(signer) is broken in DAppSigner — it tries to
        // route TransactionReceiptQuery through WalletConnect which throws:
        //   "(BUG) Query.fromBytes() not implemented for type getByKey"
        // Receipt queries are unsigned/free — use plain Client.forX() instead.
        const receiptClient = net === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
        const receipt = await response.getReceipt(receiptClient);
        const id = receipt.tokenId?.toString() ?? null;

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

import { useCallback, useState } from 'react';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TransactionId,
  AccountId,
  Client,
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

        // DAppSigner.populateTransaction() only sets transactionId — it never
        // sets nodeAccountIds. freezeWith(client) sets nodeAccountIds but
        // Client.forX() has no operator so it can't auto-generate a txId.
        // Solution: set both manually, then call freeze() directly.
        // Nodes 0.0.3–0.0.7 are valid consensus nodes on both mainnet & testnet.
        const nodeIds = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

        // No adminKey / supplyKey — any randomly-generated key must also sign
        // the creation transaction, which WalletConnect cannot provide.
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

        // Set both txId and nodeAccountIds explicitly so freeze() succeeds
        // without needing a client with an operator.
        tx.setTransactionId(TransactionId.generate(AccountId.fromString(accountId)));
        tx.setNodeAccountIds(nodeIds.map((id) => AccountId.fromString(id)));

        const frozenTx = tx.freeze();
        const response = await frozenTx.executeWithSigner(signer);

        // getReceiptWithSigner(signer) is broken in DAppSigner — it tries to
        // route a TransactionReceiptQuery through WalletConnect which throws:
        //   "(BUG) Query.fromBytes() not implemented for type getByKey"
        // Use getReceipt(client) instead — receipt queries are free (no
        // operator or signing needed), a plain Client.forX() is sufficient.
        const receiptClient = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
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

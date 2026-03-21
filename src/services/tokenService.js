import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenBurnTransaction,
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk';
import { getClient } from './hederaClient.js';

/**
 * Create a new Hedera fungible token (e.g. carbon credit)
 * @param {object} params
 * @returns {string} tokenId
 */
export async function createFungibleToken({
  name,
  symbol,
  decimals = 2,
  initialSupply = 1000,
  maxSupply = 10_000_000,
  memo = '',
}) {
  const client = getClient();
  const adminKey = PrivateKey.generateECDSA();
  const supplyKey = PrivateKey.generateECDSA();

  const tx = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(maxSupply)
    .setTreasuryAccountId(client.operatorAccountId)
    .setAdminKey(adminKey.publicKey)
    .setSupplyKey(supplyKey.publicKey)
    .setTokenMemo(memo)
    .setMaxTransactionFee(new Hbar(30))
    .freezeWith(client);

  const signedTx = await (await tx.sign(adminKey)).sign(supplyKey);
  const receipt = await (await signedTx.execute(client)).getReceipt(client);

  const tokenId = receipt.tokenId.toString();
  console.log(`✅ Token created: ${tokenId}`);
  return { tokenId, adminKey: adminKey.toStringDer(), supplyKey: supplyKey.toStringDer() };
}

/**
 * Mint additional supply of a token
 */
export async function mintTokens({ tokenId, amount, supplyKeyDer }) {
  const client = getClient();
  const supplyKey = PrivateKey.fromStringDer(supplyKeyDer);

  const tx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(amount)
    .freezeWith(client)
    .sign(supplyKey);

  const receipt = await (await tx.execute(client)).getReceipt(client);
  console.log(`✅ Minted ${amount} tokens. New supply: ${receipt.totalSupply}`);
  return receipt.totalSupply.toString();
}

/**
 * Transfer tokens between accounts
 */
export async function transferTokens({ tokenId, fromAccountId, toAccountId, amount }) {
  const client = getClient();

  const tx = await new TransferTransaction()
    .addTokenTransfer(tokenId, fromAccountId, -amount)
    .addTokenTransfer(tokenId, toAccountId, amount)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`✅ Transferred ${amount} tokens: ${fromAccountId} → ${toAccountId}`);
  return receipt.status.toString();
}

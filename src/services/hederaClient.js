import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import 'dotenv/config';

/**
 * Create and return a configured Hedera client
 * @returns {Client}
 */
export function getClient() {
  const operatorId = AccountId.fromString(process.env.OPERATOR_ACCOUNT_ID);
  const operatorKey = PrivateKey.fromStringDer(process.env.OPERATOR_PRIVATE_KEY);

  const network = process.env.HEDERA_NETWORK || 'testnet';
  let client;

  if (network === 'mainnet') {
    client = Client.forMainnet();
  } else if (network === 'previewnet') {
    client = Client.forPreviewnet();
  } else {
    client = Client.forTestnet();
  }

  client.setOperator(operatorId, operatorKey);
  return client;
}

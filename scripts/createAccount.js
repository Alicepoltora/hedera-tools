/**
 * Script: Create a new Hedera testnet account
 * Usage: node scripts/createAccount.js
 */
import 'dotenv/config';
import {
  AccountCreateTransaction,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk';
import { getClient } from '../src/services/hederaClient.js';

const client = getClient();
const newKey = PrivateKey.generateECDSA();

const tx = new AccountCreateTransaction()
  .setKey(newKey.publicKey)
  .setInitialBalance(new Hbar(10));

const receipt = await (await tx.execute(client)).getReceipt(client);
const newAccountId = receipt.accountId.toString();

console.log('──────────────────────────────────────');
console.log(`✅ New account created: ${newAccountId}`);
console.log(`   Public key : ${newKey.publicKey.toStringDer()}`);
console.log(`   Private key: ${newKey.toStringDer()}`);
console.log('⚠️  Save your private key securely — do NOT commit it!');
console.log('──────────────────────────────────────');

client.close();

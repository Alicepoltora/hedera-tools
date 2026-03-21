/**
 * Script: Create a Carbon Credit token on Hedera testnet
 * Usage: node scripts/createToken.js
 */
import 'dotenv/config';
import { createFungibleToken } from '../src/services/tokenService.js';

const result = await createFungibleToken({
  name: 'Carbon Credit',
  symbol: 'CCR',
  decimals: 2,
  initialSupply: 100_000,   // 1,000.00 CCR (2 decimals)
  maxSupply: 10_000_000,
  memo: 'Hedera Apex 2026 — Carbon Credit Token',
});

console.log('──────────────────────────────────────');
console.log(`Token ID  : ${result.tokenId}`);
console.log(`Admin key : ${result.adminKey}`);
console.log(`Supply key: ${result.supplyKey}`);
console.log('⚠️  Save these keys securely!');
console.log('──────────────────────────────────────');

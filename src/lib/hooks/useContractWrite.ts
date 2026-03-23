import { useCallback, useState } from 'react';
import {
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  TransactionId,
  AccountId,
} from '@hiero-ledger/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { useHedera } from './useHedera';

export interface ContractWriteResult {
  txId: string | null;
  loading: boolean;
  error: string | null;
  write: (params: ContractWriteParams) => Promise<string | null>;
  reset: () => void;
}

export interface ContractWriteParams {
  contractId: string;        // Hedera contract ID: 0.0.XXXXX
  functionName: string;      // Name of the function to call
  /** ABI-encoded function parameters (bytes). Use ethers/viem to encode. */
  encodedParams?: Uint8Array;
  /** Gas limit. Default: 100_000 */
  gas?: number;
  /** HBAR to attach to payable function calls */
  payableAmount?: number;
}

const DEMO_DELAY = 1200;
const NODE_IDS = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.7'];

/**
 * Execute a state-changing function on a Hedera smart contract.
 * Signs the transaction via the connected wallet (HashPack).
 *
 * @example
 * const { write, loading } = useContractWrite();
 * await write({ contractId: '0.0.12345', functionName: 'transfer', gas: 80_000 });
 */
export function useContractWrite(): ContractWriteResult {
  const { signer, connector, accountId, isConnected, demoMode } = useHedera();

  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTxId(null);
    setError(null);
  }, []);

  const write = useCallback(async (params: ContractWriteParams): Promise<string | null> => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      await new Promise((r) => setTimeout(r, DEMO_DELAY));
      const fake = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`;
      setTxId(fake);
      setLoading(false);
      return fake;
    }

    if (!isConnected || !accountId) {
      setError('Wallet not connected.');
      setLoading(false);
      return null;
    }

    try {
      if (!signer) throw new Error('Wallet signer not available');
      if (!connector) throw new Error('WalletConnect connector not available');

      const tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(params.contractId))
        .setGas(params.gas ?? 100_000)
        .setFunction(params.functionName)
        .setTransactionId(TransactionId.generate(AccountId.fromString(accountId)))
        .setNodeAccountIds(NODE_IDS.map((id) => AccountId.fromString(id)));

      if (params.encodedParams) {
        tx.setFunctionParameters(params.encodedParams);
      }

      if (params.payableAmount) {
        tx.setPayableAmount(new Hbar(params.payableAmount));
      }

      const frozenTx = tx.freeze();
      const id = frozenTx.transactionId!.toString();

      const fullySigned = await signer.signTransaction(frozenTx);
      await connector.executeTransaction({
        signedTransaction: [transactionToBase64String(fullySigned)],
      });

      setTxId(id);
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Contract write failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [signer, connector, accountId, isConnected, demoMode]);

  return { txId, loading, error, write, reset };
}

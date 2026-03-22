import { useCallback, useEffect, useState } from 'react';
import { useHedera } from './useHedera';

export interface UseContractReadOptions {
  /** Auto-fetch on mount. Default: true */
  immediate?: boolean;
  /** Poll interval in ms. 0 = disabled */
  pollInterval?: number;
}

export interface UseContractReadResult<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  call: () => Promise<T | null>;
}

const JSON_RPC_URLS: Record<string, string> = {
  testnet: 'https://testnet.hashio.io/api',
  mainnet: 'https://mainnet.hashio.io/api',
  previewnet: 'https://previewnet.hashio.io/api',
};

/**
 * Read data from a deployed Hedera smart contract using JSON-RPC Relay (eth_call).
 * No wallet connection required — pure read-only query.
 *
 * @param contractEvmAddress - EVM address of the deployed contract (0x...)
 * @param abi - ABI fragment for the function being called
 * @param functionName - Name of the view/pure function
 * @param args - Arguments to pass to the function (ABI-encoded)
 *
 * @example
 * const { data } = useContractRead('0xABC...', erc20Abi, 'totalSupply');
 */
export function useContractRead<T = unknown>(
  contractEvmAddress: string,
  encodedCallData: string, // ABI-encoded calldata (use viem/ethers encodeAbiParameters)
  options: UseContractReadOptions = {}
): UseContractReadResult<T> {
  const { immediate = true, pollInterval = 0 } = options;
  const { demoMode, network } = useHedera();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (): Promise<T | null> => {
    if (!contractEvmAddress || !encodedCallData) return null;

    if (demoMode) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      // Return a plausible demo hex result (10000 in uint256)
      const demo = '0x0000000000000000000000000000000000000000000000000000000000002710' as unknown as T;
      setData(demo);
      setLoading(false);
      return demo;
    }

    setLoading(true);
    setError(null);

    const rpcUrl = JSON_RPC_URLS[network] ?? JSON_RPC_URLS.testnet;

    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_call',
          params: [
            { to: contractEvmAddress, data: encodedCallData },
            'latest',
          ],
        }),
      });

      if (!res.ok) throw new Error(`JSON-RPC error: ${res.status}`);
      const json = await res.json();

      if (json.error) throw new Error(json.error.message ?? 'Contract call failed');

      const result = json.result as T;
      setData(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Contract read failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractEvmAddress, encodedCallData, demoMode, network]);

  useEffect(() => {
    if (!immediate) return;
    void call();
  }, [call, immediate]);

  useEffect(() => {
    if (!pollInterval) return;
    const id = setInterval(() => void call(), pollInterval);
    return () => clearInterval(id);
  }, [call, pollInterval]);

  return { data, loading, error, call };
}

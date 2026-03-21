import { useContext } from 'react';
import { HederaContext, type HederaContextState, type HederaNetwork } from '../context/HederaProvider';

export type { HederaNetwork };

/**
 * Primary hook — returns wallet state and connect/disconnect actions.
 *
 * @example
 * const { accountId, balance, isConnected, connect, disconnect } = useHedera();
 */
export function useHedera(): HederaContextState {
  const ctx = useContext(HederaContext);
  if (!ctx) {
    throw new Error('useHedera must be used inside <HederaProvider>');
  }
  return ctx;
}

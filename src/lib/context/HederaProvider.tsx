import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LedgerId } from '@hiero-ledger/sdk';
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
  type DAppSigner,
} from '@hashgraph/hedera-wallet-connect';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type HederaNetwork = 'testnet' | 'mainnet' | 'previewnet';

export interface HederaContextState {
  accountId: string | null;
  balance: number | null;
  network: HederaNetwork;
  isConnected: boolean;
  isConnecting: boolean;
  demoMode: boolean;
  signer: DAppSigner | null;
  connector: DAppConnector | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setNetwork: (network: HederaNetwork) => void;
}

export interface HederaProviderProps {
  children: ReactNode;
  /** Target Hedera network. Default: 'testnet' */
  network?: HederaNetwork;
  /** WalletConnect Cloud project ID — https://cloud.walletconnect.com */
  walletConnectProjectId: string;
  /** When true, wallet interactions are simulated — great for demos */
  demoMode?: boolean;
  appMetadata?: {
    name?: string;
    description?: string;
    url?: string;
    icons?: string[];
  };
  /**
   * Called whenever the user switches networks via setNetwork().
   * Use this to lift network state up and re-key the provider if needed.
   */
  onNetworkChange?: (network: HederaNetwork) => void;
}

// ─────────────────────────────────────────────
// Context defaults
// ─────────────────────────────────────────────

export const HederaContext = createContext<HederaContextState>({
  accountId: null,
  balance: null,
  network: 'testnet',
  isConnected: false,
  isConnecting: false,
  demoMode: false,
  signer: null,
  connector: null,
  connect: async () => {},
  disconnect: async () => {},
  setNetwork: () => {},
});

// ─────────────────────────────────────────────
// QueryClient (singleton per provider tree)
// ─────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // 30s
      gcTime: 5 * 60_000,     // 5min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MIRROR_NODES: Record<HederaNetwork, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const CHAIN_IDS: Record<HederaNetwork, HederaChainId> = {
  testnet: HederaChainId.Testnet,
  mainnet: HederaChainId.Mainnet,
  previewnet: HederaChainId.Testnet, // previewnet maps to testnet chain
};

const DEMO_ACCOUNT = '0.0.1234567';
const DEMO_BALANCE = 1234.56;

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function HederaProvider({
  children,
  network: initialNetwork = 'testnet',
  walletConnectProjectId,
  demoMode = false,
  appMetadata = {},
  onNetworkChange,
}: HederaProviderProps) {
  const [network, setNetworkState] = useState<HederaNetwork>(initialNetwork);

  const setNetwork = useCallback((n: HederaNetwork) => {
    setNetworkState(n);
    onNetworkChange?.(n);
  }, [onNetworkChange]);

  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [signer, setSigner] = useState<DAppSigner | null>(null);
  const [connector, setConnector] = useState<DAppConnector | null>(null);

  const ledgerId = network === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;

  // ── Fetch HBAR balance from Mirror Node ──
  const fetchBalance = useCallback(
    async (accId: string) => {
      try {
        const res = await fetch(
          `${MIRROR_NODES[network]}/api/v1/balances?account.id=${accId}`
        );
        const data = await res.json();
        const tinybars: number = data.balances?.[0]?.balance ?? 0;
        setBalance(tinybars / 1e8);
      } catch {
        setBalance(null);
      }
    },
    [network]
  );

  // ── Initialise WalletConnect DApp Connector ──
  // Re-runs whenever the network changes, creating a fresh connector for the
  // new chain while safely discarding the previous one.
  useEffect(() => {
    if (demoMode) return;

    // Reset all connection state immediately so the UI never shows stale data
    // from the previous network while the new connector is initialising.
    setIsConnected(false);
    setAccountId(null);
    setBalance(null);
    setSigner(null);
    setConnector(null);

    let isCurrent = true; // guard against stale async callbacks after cleanup

    const dAppMetadata = {
      name: appMetadata.name ?? 'Hedera UI Kit',
      description: appMetadata.description ?? 'Built with hedera-ui-kit',
      url: appMetadata.url ?? window.location.origin,
      icons: appMetadata.icons ?? [`${window.location.origin}/favicon.ico`],
    };

    const dAppConnector = new DAppConnector(
      dAppMetadata,
      ledgerId,
      walletConnectProjectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [CHAIN_IDS[network]]
    );

    void dAppConnector.init({ logger: 'error' }).then(() => {
      if (!isCurrent) return; // network changed again before init finished
      setConnector(dAppConnector);

      // Restore existing session if available for this network
      const signers = dAppConnector.signers;
      if (signers.length > 0) {
        const s = signers[0];
        const accId = s.getAccountId().toString();
        setSigner(s);
        setAccountId(accId);
        setIsConnected(true);
        void fetchBalance(accId);
      }
    });

    return () => {
      // Mark this effect instance as stale so the async init callback is ignored.
      // We intentionally do NOT call disconnectAll() — that would destroy the
      // WalletConnect session in localStorage and force the user to re-scan the
      // QR code after every network switch.
      isCurrent = false;
      setConnector(null);
    };
  }, [network, walletConnectProjectId, demoMode, ledgerId, fetchBalance,
      appMetadata.description, appMetadata.icons, appMetadata.name, appMetadata.url]);

  // ── connect ──
  const connect = useCallback(async () => {
    // Demo mode — simulate wallet connection
    if (demoMode) {
      setIsConnecting(true);
      await new Promise((r) => setTimeout(r, 900));
      setAccountId(DEMO_ACCOUNT);
      setBalance(DEMO_BALANCE);
      setIsConnected(true);
      setIsConnecting(false);
      return;
    }

    if (!connector) return;
    setIsConnecting(true);
    try {
      await connector.openModal();
      const signers = connector.signers;
      if (signers.length > 0) {
        const s = signers[0];
        const accId = s.getAccountId().toString();
        setSigner(s);
        setAccountId(accId);
        setIsConnected(true);
        void fetchBalance(accId);
      }
    } catch {
      // User closed modal
    } finally {
      setIsConnecting(false);
    }
  }, [demoMode, connector, fetchBalance]);

  // ── disconnect ──
  const disconnect = useCallback(async () => {
    if (demoMode) {
      setIsConnected(false);
      setAccountId(null);
      setBalance(null);
      setSigner(null);
      return;
    }
    if (!connector) return;
    await connector.disconnectAll().catch(() => {});
    setIsConnected(false);
    setAccountId(null);
    setBalance(null);
    setSigner(null);
  }, [demoMode, connector]);

  return (
    <QueryClientProvider client={queryClient}>
      <HederaContext.Provider
        value={{
          accountId,
          balance,
          network,
          isConnected,
          isConnecting,
          demoMode,
          signer,
          connector,
          connect,
          disconnect,
          setNetwork,
        }}
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f1f5f9',
            },
          }}
        />
      </HederaContext.Provider>
    </QueryClientProvider>
  );
}

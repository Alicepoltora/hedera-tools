import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { HashConnect, type SessionData } from '@hashgraph/hashconnect';
import { LedgerId } from '@hashgraph/sdk';

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
  hashconnect: HashConnect | null;
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
  /** When true, wallet interactions are simulated (useful for demos / CI) */
  demoMode?: boolean;
  appMetadata?: {
    name?: string;
    description?: string;
    url?: string;
    icons?: string[];
  };
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

export const HederaContext = createContext<HederaContextState>({
  accountId: null,
  balance: null,
  network: 'testnet',
  isConnected: false,
  isConnecting: false,
  demoMode: false,
  hashconnect: null,
  connect: async () => {},
  disconnect: async () => {},
  setNetwork: () => {},
});

const MIRROR_NODES: Record<HederaNetwork, string> = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const LEDGER_IDS: Record<HederaNetwork, LedgerId> = {
  testnet: LedgerId.TESTNET,
  mainnet: LedgerId.MAINNET,
  previewnet: LedgerId.PREVIEWNET,
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
}: HederaProviderProps) {
  const [network, setNetwork] = useState<HederaNetwork>(initialNetwork);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hashconnect, setHashconnect] = useState<HashConnect | null>(null);

  // ── Fetch balance from Mirror Node ──
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

  // ── Initialise HashConnect ──
  useEffect(() => {
    if (demoMode) return; // skip in demo mode

    const hc = new HashConnect(
      LEDGER_IDS[network],
      walletConnectProjectId,
      {
        name: appMetadata.name ?? 'Hedera UI Kit',
        description: appMetadata.description ?? 'Built with hedera-ui-kit',
        url: appMetadata.url ?? window.location.origin,
        icons: appMetadata.icons ?? [`${window.location.origin}/favicon.ico`],
      },
      false // debug off
    );

    hc.pairingEvent.on((data: SessionData) => {
      const accId = data.accountIds?.[0]?.toString();
      if (accId) {
        setAccountId(accId);
        setIsConnected(true);
        setIsConnecting(false);
        void fetchBalance(accId);
      }
    });

    hc.disconnectionEvent.on(() => {
      setIsConnected(false);
      setAccountId(null);
      setBalance(null);
    });

    void hc.init().then(() => setHashconnect(hc));

    return () => {
      void hc.disconnect();
    };
  }, [network, walletConnectProjectId, demoMode, fetchBalance, appMetadata.description, appMetadata.icons, appMetadata.name, appMetadata.url]);

  // ── connect ──
  const connect = useCallback(async () => {
    if (demoMode) {
      setIsConnecting(true);
      await new Promise((r) => setTimeout(r, 900));
      setAccountId(DEMO_ACCOUNT);
      setBalance(DEMO_BALANCE);
      setIsConnected(true);
      setIsConnecting(false);
      return;
    }
    if (!hashconnect) return;
    setIsConnecting(true);
    try {
      hashconnect.openModal();
    } catch {
      setIsConnecting(false);
    }
  }, [demoMode, hashconnect]);

  // ── disconnect ──
  const disconnect = useCallback(async () => {
    if (demoMode) {
      setIsConnected(false);
      setAccountId(null);
      setBalance(null);
      return;
    }
    if (!hashconnect) return;
    await hashconnect.disconnect();
    setIsConnected(false);
    setAccountId(null);
    setBalance(null);
  }, [demoMode, hashconnect]);

  return (
    <HederaContext.Provider
      value={{
        accountId,
        balance,
        network,
        isConnected,
        isConnecting,
        demoMode,
        hashconnect,
        connect,
        disconnect,
        setNetwork,
      }}
    >
      {children}
    </HederaContext.Provider>
  );
}

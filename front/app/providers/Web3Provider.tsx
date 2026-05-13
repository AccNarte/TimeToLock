'use client';

import { ReactNode } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: ReactNode;
}

// Create query client outside component to avoid recreating it
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cached data kept (gcTime replaces cacheTime in v5)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Get project ID - use a fallback for development
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

if (typeof window !== 'undefined' && (!projectId || projectId === 'YOUR_PROJECT_ID')) {
  console.warn('⚠️ NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID n\'est pas configuré. WalletConnect ne fonctionnera pas correctement.');
}

// Reliable public RPC endpoints
const RPC_URLS = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  polygonAmoy: 'https://rpc-amoy.polygon.technology',
};

// Create wagmi config OUTSIDE the component to persist across renders/refreshes
const wagmiConfig = getDefaultConfig({
  appName: 'TimeLock',
  projectId,
  chains: [polygon, polygonAmoy, mainnet],
  transports: {
    [mainnet.id]: http(RPC_URLS.ethereum),
    [polygon.id]: http(RPC_URLS.polygon),
    [polygonAmoy.id]: http(RPC_URLS.polygonAmoy),
  },
  ssr: false, // Disable SSR to prevent indexedDB errors
});

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00D9FF',
            accentColorForeground: '#0a1628',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;



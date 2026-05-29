"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@/contexts/auth-context';
import { EmbeddedWalletProvider } from '@/contexts/embedded-wallet-context';
import { Toaster } from 'sonner';
import { GlobalUnlockWalletModal } from '@/components/global-unlock-wallet-modal';
import { silenceWalletAnalytics } from '@/lib/silence-wallet-analytics';

silenceWalletAnalytics();

// Dynamically import Web3Provider with SSR disabled
const Web3Provider = dynamic(
  () => import('@/app/providers/Web3Provider').then((mod) => mod.Web3Provider),
  {
    ssr: false,
  }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render children without Web3Provider during SSR and initial mount
  // This prevents indexedDB errors while still allowing the page to render
  if (!mounted) {
    return (
      <AuthProvider>
        <EmbeddedWalletProvider>
          {children}
          <Toaster position="top-right" richColors />
        </EmbeddedWalletProvider>
      </AuthProvider>
    );
  }

  return (
    <Web3Provider>
      <AuthProvider>
        <EmbeddedWalletProvider>
          {children}
          <GlobalUnlockWalletModal />
          <Toaster position="top-right" richColors />
        </EmbeddedWalletProvider>
      </AuthProvider>
    </Web3Provider>
  );
}


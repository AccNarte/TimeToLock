"use client";

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { useEmbeddedWallet } from '@/contexts/embedded-wallet-context';
import { useWallets } from './use-wallets';

interface SignerResult {
  signer: ethers.Signer | null;
  address: string | null;
  isEmbedded: boolean;
}

/**
 * Hook that provides a unified interface for signing transactions
 * Works with both external wallets (via wagmi) and embedded wallets
 */
export function useWalletSigner() {
  const { address: externalAddress, isConnected: isExternalConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { wallets } = useWallets();
  const {
    isUnlocked: isEmbeddedUnlocked,
    unlockedAddress,
    getWallet,
    requestUnlock,
  } = useEmbeddedWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find user's embedded wallet
  const embeddedWallet = wallets.find((w) => w.type === 'internal');

  /**
   * Get the current signer - either external or embedded
   * For embedded wallets, this will prompt for password if not unlocked
   */
  const getSigner = useCallback(async (): Promise<SignerResult> => {
    setError(null);

    // Priority 1: External wallet connected via wagmi
    if (isExternalConnected && walletClient && externalAddress) {
      try {
        // Create ethers provider from wallet client
        const provider = new ethers.BrowserProvider(walletClient as any);
        const signer = await provider.getSigner();
        return {
          signer,
          address: externalAddress,
          isEmbedded: false,
        };
      } catch (err) {
        console.error('Failed to get external signer:', err);
        // Fall through to try embedded wallet
      }
    }

    // Priority 2: Embedded wallet
    if (embeddedWallet) {
      // Check if already unlocked
      if (isEmbeddedUnlocked && unlockedAddress) {
        const wallet = getWallet();
        if (wallet) {
          return {
            signer: wallet,
            address: unlockedAddress,
            isEmbedded: true,
          };
        }
      }

      // Request unlock via password modal
      setIsLoading(true);
      try {
        const walletId = parseInt(embeddedWallet.id);
        const success = await requestUnlock(walletId, embeddedWallet.address);

        if (success) {
          const wallet = getWallet();
          if (wallet) {
            return {
              signer: wallet,
              address: embeddedWallet.address,
              isEmbedded: true,
            };
          }
        }

        throw new Error('Failed to unlock wallet');
      } catch (err) {
        setError('Échec du déverrouillage du wallet');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }

    setError('Aucun wallet disponible');
    return { signer: null, address: null, isEmbedded: false };
  }, [
    isExternalConnected,
    walletClient,
    externalAddress,
    embeddedWallet,
    isEmbeddedUnlocked,
    unlockedAddress,
    getWallet,
    requestUnlock,
  ]);

  /**
   * Check if any wallet is available (external or embedded)
   */
  const hasWallet = isExternalConnected || !!embeddedWallet;

  /**
   * Get the preferred wallet address
   */
  const preferredAddress = externalAddress || embeddedWallet?.address || null;

  /**
   * Check if using embedded wallet
   */
  const isUsingEmbedded = !isExternalConnected && !!embeddedWallet;

  return {
    getSigner,
    hasWallet,
    preferredAddress,
    isUsingEmbedded,
    isExternalConnected,
    hasEmbeddedWallet: !!embeddedWallet,
    embeddedWalletAddress: embeddedWallet?.address || null,
    isLoading,
    error,
  };
}

"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { getWalletFromEncrypted, validatePassword } from '@/lib/embedded-wallet';
import { walletsService, EmbeddedWalletData } from '@/lib/api/services/wallets.service';

interface EmbeddedWalletContextType {
  // State
  isUnlocked: boolean;
  unlockedWalletId: number | null;
  unlockedAddress: string | null;

  // Actions
  unlockWallet: (walletId: number, password: string) => Promise<boolean>;
  lockWallet: () => void;
  signTransaction: (tx: ethers.TransactionRequest) => Promise<ethers.TransactionResponse>;
  signMessage: (message: string) => Promise<string>;
  getWallet: () => ethers.Wallet | null;

  // Password modal
  requestUnlock: (walletId: number, address: string) => Promise<boolean>;
  isPasswordModalOpen: boolean;
  pendingWalletId: number | null;
  pendingWalletAddress: string | null;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  onPasswordCancel: () => void;
}

const EmbeddedWalletContext = createContext<EmbeddedWalletContextType | undefined>(undefined);

// Polygon mainnet RPC (free, no auth required)
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';

export function EmbeddedWalletProvider({ children }: { children: React.ReactNode }) {
  // Unlocked wallet state
  const [unlockedWallet, setUnlockedWallet] = useState<ethers.Wallet | null>(null);
  const [unlockedWalletId, setUnlockedWalletId] = useState<number | null>(null);
  const [unlockedAddress, setUnlockedAddress] = useState<string | null>(null);
  const [encryptedData, setEncryptedData] = useState<EmbeddedWalletData | null>(null);

  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<number | null>(null);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const [unlockResolver, setUnlockResolver] = useState<((success: boolean) => void) | null>(null);

  /**
   * Unlock a wallet with password
   */
  const unlockWallet = useCallback(async (walletId: number, password: string): Promise<boolean> => {
    try {
      // Fetch encrypted data
      const data = await walletsService.getEncryptedData(walletId);
      setEncryptedData(data);

      // Create provider
      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);

      // Decrypt and create wallet
      const wallet = await getWalletFromEncrypted(data.encryptedPrivateKey, password, provider);

      // Validate the address matches
      const isValid = wallet.address.toLowerCase() === pendingWalletAddress?.toLowerCase();
      if (!isValid) {
        throw new Error('Address mismatch');
      }

      setUnlockedWallet(wallet);
      setUnlockedWalletId(walletId);
      setUnlockedAddress(wallet.address);

      return true;
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      return false;
    }
  }, [pendingWalletAddress]);

  /**
   * Lock the wallet (clear from memory)
   */
  const lockWallet = useCallback(() => {
    setUnlockedWallet(null);
    setUnlockedWalletId(null);
    setUnlockedAddress(null);
    setEncryptedData(null);
  }, []);

  /**
   * Sign a transaction with the unlocked wallet
   */
  const signTransaction = useCallback(async (tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> => {
    if (!unlockedWallet) {
      throw new Error('Wallet not unlocked');
    }
    return unlockedWallet.sendTransaction(tx);
  }, [unlockedWallet]);

  /**
   * Sign a message with the unlocked wallet
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!unlockedWallet) {
      throw new Error('Wallet not unlocked');
    }
    return unlockedWallet.signMessage(message);
  }, [unlockedWallet]);

  /**
   * Get the unlocked wallet instance
   */
  const getWallet = useCallback((): ethers.Wallet | null => {
    return unlockedWallet;
  }, [unlockedWallet]);

  /**
   * Request unlock via password modal
   * Returns a promise that resolves when user enters password or cancels
   */
  const requestUnlock = useCallback((walletId: number, address: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingWalletId(walletId);
      setPendingWalletAddress(address);
      setUnlockResolver(() => resolve);
      setIsPasswordModalOpen(true);
    });
  }, []);

  /**
   * Handle password submission from modal
   * Returns true on success, throws on failure
   */
  const onPasswordSubmit = useCallback(async (password: string): Promise<boolean> => {
    if (!pendingWalletId || !unlockResolver) {
      throw new Error('État invalide');
    }

    const success = await unlockWallet(pendingWalletId, password);

    if (!success) {
      // Don't close modal, let user retry
      throw new Error('Mot de passe incorrect');
    }

    setIsPasswordModalOpen(false);
    setPendingWalletId(null);
    setPendingWalletAddress(null);

    unlockResolver(true);
    setUnlockResolver(null);
    return true;
  }, [pendingWalletId, unlockResolver, unlockWallet]);

  /**
   * Handle password modal cancel
   */
  const onPasswordCancel = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPendingWalletId(null);
    setPendingWalletAddress(null);

    if (unlockResolver) {
      unlockResolver(false);
      setUnlockResolver(null);
    }
  }, [unlockResolver]);

  const value: EmbeddedWalletContextType = {
    isUnlocked: !!unlockedWallet,
    unlockedWalletId,
    unlockedAddress,
    unlockWallet,
    lockWallet,
    signTransaction,
    signMessage,
    getWallet,
    requestUnlock,
    isPasswordModalOpen,
    pendingWalletId,
    pendingWalletAddress,
    onPasswordSubmit,
    onPasswordCancel,
  };

  return (
    <EmbeddedWalletContext.Provider value={value}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

export function useEmbeddedWallet() {
  const context = useContext(EmbeddedWalletContext);
  if (context === undefined) {
    throw new Error('useEmbeddedWallet must be used within an EmbeddedWalletProvider');
  }
  return context;
}

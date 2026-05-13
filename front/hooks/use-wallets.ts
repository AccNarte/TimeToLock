"use client";

import { useState, useEffect, useCallback } from 'react';
import { walletsService, Wallet, CreateInternalWalletRequest, LinkExternalWalletRequest, CreateWalletResponse } from '@/lib/api';
import { generateEncryptedWallet, decryptMnemonic } from '@/lib/embedded-wallet';
import { EmbeddedWalletData } from '@/lib/api/services/wallets.service';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletsService.getAll();
      setWallets(data);
    } catch (err) {
      setError('Erreur lors du chargement des wallets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const createInternal = async (data: CreateInternalWalletRequest): Promise<CreateWalletResponse> => {
    try {
      const response = await walletsService.createInternal(data);
      setWallets((prev) => [...prev, response.wallet]);
      return response;
    } catch (err) {
      setError('Erreur lors de la création du wallet');
      throw err;
    }
  };

  const linkExternal = async (data: LinkExternalWalletRequest) => {
    try {
      const wallet = await walletsService.linkExternal(data);
      setWallets((prev) => [...prev, wallet]);
      return wallet;
    } catch (err) {
      setError('Erreur lors de la liaison du wallet');
      throw err;
    }
  };

  /**
   * Create an embedded wallet with client-side encryption
   * Returns the mnemonic for one-time display
   */
  const createEmbedded = async (password: string): Promise<{ wallet: Wallet; mnemonic: string }> => {
    try {
      // Generate and encrypt wallet client-side
      const { walletData, mnemonic } = await generateEncryptedWallet(password);

      // Save to backend
      const response = await walletsService.createEmbedded(walletData);
      setWallets((prev) => [...prev, response.wallet]);

      return { wallet: response.wallet, mnemonic };
    } catch (err) {
      setError('Erreur lors de la création du wallet embarqué');
      throw err;
    }
  };

  /**
   * Get encrypted data for a wallet (for decryption)
   */
  const getEncryptedData = async (walletId: number): Promise<EmbeddedWalletData> => {
    return walletsService.getEncryptedData(walletId);
  };

  /**
   * Export mnemonic for an embedded wallet (requires password)
   */
  const exportMnemonic = async (walletId: number, password: string): Promise<string> => {
    const data = await walletsService.getEncryptedData(walletId);
    return decryptMnemonic(data.encryptedMnemonic, password);
  };

  /**
   * Check if a wallet is embedded (internal with encrypted data)
   */
  const isEmbeddedWallet = (wallet: Wallet): boolean => {
    return wallet.type === 'internal';
  };

  return {
    wallets,
    isLoading,
    error,
    refetch: fetchWallets,
    createInternal,
    linkExternal,
    createEmbedded,
    getEncryptedData,
    exportMnemonic,
    isEmbeddedWallet,
  };
}



"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { getWalletFromEncrypted, validatePassword } from '@/lib/embedded-wallet';
import { walletsService, EmbeddedWalletData } from '@/lib/api/services/wallets.service';

interface EmbeddedWalletContextType {
  // État
  isUnlocked: boolean;
  unlockedWalletId: number | null;
  unlockedAddress: string | null;

  // Actions
  unlockWallet: (walletId: number, password: string) => Promise<boolean>;
  lockWallet: () => void;
  signTransaction: (tx: ethers.TransactionRequest) => Promise<ethers.TransactionResponse>;
  signMessage: (message: string) => Promise<string>;
  getWallet: () => ethers.Wallet | null;

  // Modale de saisie du mot de passe
  requestUnlock: (walletId: number, address: string) => Promise<boolean>;
  isPasswordModalOpen: boolean;
  pendingWalletId: number | null;
  pendingWalletAddress: string | null;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  onPasswordCancel: () => void;
}

const EmbeddedWalletContext = createContext<EmbeddedWalletContextType | undefined>(undefined);

// RPC public Polygon Mainnet (gratuit, sans auth).
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';

/**
 * Provider du contexte « wallet embarqué » :
 *  - garde en mémoire le wallet ethers déverrouillé,
 *  - expose `signMessage` / `signTransaction` pour signer sans MetaMask,
 *  - gère la modale globale de saisie du mot de passe via le pattern
 *    « request-unlock → Promise<boolean> » : n'importe quel composant
 *    peut demander un déverrouillage et attendre la résolution.
 */
export function EmbeddedWalletProvider({ children }: { children: React.ReactNode }) {
  // État du wallet déverrouillé.
  const [unlockedWallet, setUnlockedWallet] = useState<ethers.Wallet | null>(null);
  const [unlockedWalletId, setUnlockedWalletId] = useState<number | null>(null);
  const [unlockedAddress, setUnlockedAddress] = useState<string | null>(null);
  const [encryptedData, setEncryptedData] = useState<EmbeddedWalletData | null>(null);

  // Miroir `useRef` du wallet déverrouillé. Indispensable : un appelant qui
  // fait `await requestUnlock(...)` puis lit le wallet dans le MÊME tick
  // (avant que React ne re-rende) verrait un getter mémoïsé sur l'ancien
  // état (donc `null`). La ref, elle, est toujours à jour, donc
  // `getWallet()` renvoie le bon wallet juste après le déverrouillage.
  const unlockedWalletRef = useRef<ethers.Wallet | null>(null);

  // État de la modale de saisie du mot de passe.
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<number | null>(null);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const [unlockResolver, setUnlockResolver] = useState<((success: boolean) => void) | null>(null);

  /** Déverrouille un wallet avec son mot de passe (déchiffre la clé privée). */
  const unlockWallet = useCallback(async (walletId: number, password: string): Promise<boolean> => {
    try {
      // Récupération du blob chiffré depuis le backend.
      const data = await walletsService.getEncryptedData(walletId);
      setEncryptedData(data);

      // Création du provider RPC pour signer/envoyer des transactions.
      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);

      // Déchiffrement de la clé privée et construction du wallet ethers.
      const wallet = await getWalletFromEncrypted(data.encryptedPrivateKey, password, provider);

      // Sanity check : l'adresse dérivée doit correspondre à celle attendue
      // (protection contre une compromission du blob côté serveur).
      const isValid = wallet.address.toLowerCase() === pendingWalletAddress?.toLowerCase();
      if (!isValid) {
        throw new Error('Address mismatch');
      }

      unlockedWalletRef.current = wallet;
      setUnlockedWallet(wallet);
      setUnlockedWalletId(walletId);
      setUnlockedAddress(wallet.address);

      return true;
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      return false;
    }
  }, [pendingWalletAddress]);

  /** Verrouille le wallet (efface la clé privée déchiffrée de la mémoire). */
  const lockWallet = useCallback(() => {
    unlockedWalletRef.current = null;
    setUnlockedWallet(null);
    setUnlockedWalletId(null);
    setUnlockedAddress(null);
    setEncryptedData(null);
  }, []);

  /** Signe et envoie une transaction avec le wallet déverrouillé. */
  const signTransaction = useCallback(async (tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> => {
    if (!unlockedWallet) {
      throw new Error('Wallet not unlocked');
    }
    return unlockedWallet.sendTransaction(tx);
  }, [unlockedWallet]);

  /** Signe un message avec le wallet déverrouillé. */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!unlockedWallet) {
      throw new Error('Wallet not unlocked');
    }
    return unlockedWallet.signMessage(message);
  }, [unlockedWallet]);

  /** Renvoie l'instance du wallet ethers déverrouillé (via la ref, toujours à jour). */
  const getWallet = useCallback((): ethers.Wallet | null => {
    return unlockedWalletRef.current;
  }, []);

  /**
   * Demande de déverrouillage du wallet via la modale de mot de passe.
   * Renvoie une Promise qui se résout quand l'utilisateur entre son mot
   * de passe (true) ou annule (false). Le résolveur est stocké dans
   * `unlockResolver` pour être appelé depuis `onPasswordSubmit`/Cancel.
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
   * Soumission du mot de passe par la modale. Renvoie true en cas de
   * succès, lève sinon (la modale reste ouverte pour permettre une
   * nouvelle tentative).
   */
  const onPasswordSubmit = useCallback(async (password: string): Promise<boolean> => {
    if (!pendingWalletId || !unlockResolver) {
      throw new Error('État invalide');
    }

    const success = await unlockWallet(pendingWalletId, password);

    if (!success) {
      // Mot de passe incorrect : on ne ferme PAS la modale (retry possible).
      throw new Error('Mot de passe incorrect');
    }

    setIsPasswordModalOpen(false);
    setPendingWalletId(null);
    setPendingWalletAddress(null);

    unlockResolver(true);
    setUnlockResolver(null);
    return true;
  }, [pendingWalletId, unlockResolver, unlockWallet]);

  /** Annulation par l'utilisateur (clic sur Annuler ou ESC). */
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

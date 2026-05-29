"use client";

import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useEmbeddedWallet } from '@/contexts/embedded-wallet-context';
import { useWallets } from '@/hooks/use-wallets-query';
import { useFactoryAddress } from '@/hooks/use-factory-address';
import { getKeyDerivationMessage } from '@/lib/crypto/blockchain-file-encryption';
import FileLockFactoryABI from '@/lib/contracts/FileLockFactory.json';
import FileLockVaultABI from '@/lib/contracts/FileLockVault.json';

const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;

/**
 * File-lock interactions using the embedded (internal) wallet — the mirror of
 * `useEmbeddedTimelock` but for the FileLockFactory. Lets email/password users
 * lock & retrieve files without MetaMask: the wallet is decrypted with the
 * account password (via EmbeddedWalletProvider) and signs everything with
 * ethers.js directly.
 *
 * The AES-key derivation signs the SAME fixed message as the external flow
 * (`getKeyDerivationMessage()`), so a file locked with the embedded wallet can
 * also be unlocked from MetaMask (same address ⇒ same signature ⇒ same key),
 * and vice-versa.
 */
export function useEmbeddedFileLock() {
  const { wallets } = useWallets();
  const { requestUnlock, getWallet } = useEmbeddedWallet();
  const { address: FILE_LOCK_FACTORY_POLYGON } = useFactoryAddress(POLYGON_CHAIN_ID, 'file_lock');

  const embeddedWallet = wallets.find((w) => w.type === 'internal');

  /** Unlock (or reuse) the embedded ethers wallet, prompting for password if needed. */
  const getConnectedWallet = useCallback(async (): Promise<ethers.Wallet | null> => {
    if (!embeddedWallet) return null;
    const existing = getWallet();
    if (existing) return existing;
    const ok = await requestUnlock(parseInt(embeddedWallet.id), embeddedWallet.address);
    return ok ? getWallet() : null;
  }, [embeddedWallet, getWallet, requestUnlock]);

  /** Sign the fixed key-derivation message — feeds the AES key derivation. */
  const signKeyDerivation = useCallback(async (): Promise<string> => {
    const wallet = await getConnectedWallet();
    if (!wallet) throw new Error('Impossible de déverrouiller le wallet embarqué');
    return wallet.signMessage(getKeyDerivationMessage());
  }, [getConnectedWallet]);

  /** Create a file lock on-chain via the embedded wallet. Returns once mined. */
  const createFileLock = useCallback(
    async (params: {
      ipfsHash: string;
      encryptedKey: string;
      unlockTimestamp: number;
    }): Promise<{ txHash: string; lockAddress: string }> => {
      if (!FILE_LOCK_FACTORY_POLYGON) {
        throw new Error('FileLock Factory non configurée pour Polygon. Déploie-la depuis /deploy.');
      }
      const wallet = await getConnectedWallet();
      if (!wallet) throw new Error('Impossible de déverrouiller le wallet embarqué');

      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
      const factory = new ethers.Contract(
        FILE_LOCK_FACTORY_POLYGON,
        FileLockFactoryABI,
        wallet.connect(provider),
      );

      const tx = await factory.createFileLock(
        params.ipfsHash,
        params.encryptedKey,
        params.unlockTimestamp,
      );
      const receipt = await tx.wait();

      // Parse FileLockCreated for the vault address
      let lockAddress = '';
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed?.name === 'FileLockCreated') {
            lockAddress = parsed.args?.lockAddress ?? '';
            break;
          }
        } catch {
          /* not our event */
        }
      }

      return { txHash: tx.hash, lockAddress };
    },
    [getConnectedWallet, FILE_LOCK_FACTORY_POLYGON],
  );

  /** Mark the vault UNLOCKED on-chain (optional — decryption works without it). */
  const retrieveKey = useCallback(
    async (vaultAddress: string): Promise<string> => {
      const wallet = await getConnectedWallet();
      if (!wallet) throw new Error('Impossible de déverrouiller le wallet embarqué');

      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
      const vault = new ethers.Contract(
        vaultAddress,
        FileLockVaultABI,
        wallet.connect(provider),
      );
      const tx = await vault.retrieveKey();
      await tx.wait();
      return tx.hash;
    },
    [getConnectedWallet],
  );

  return {
    hasEmbeddedWallet: !!embeddedWallet,
    embeddedWallet,
    embeddedWalletAddress: embeddedWallet?.address ?? null,
    factoryAddress: FILE_LOCK_FACTORY_POLYGON,
    signKeyDerivation,
    createFileLock,
    retrieveKey,
  };
}

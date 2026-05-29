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
 * Hook d'interaction avec la `FileLockFactory` pour les utilisateurs
 * email/mot de passe — c'est le miroir de `useEmbeddedTimelock` mais
 * appliqué aux verrous de fichiers.
 *
 * Permet à un utilisateur sans MetaMask de :
 *  - dériver la clé AES (en signant un message fixe),
 *  - créer un verrou de fichier on-chain,
 *  - marquer le coffre comme déverrouillé après l'échéance.
 *
 * Tout ça se fait via le wallet embarqué : sa clé privée est déchiffrée
 * par mot de passe (cf. `EmbeddedWalletProvider`) et signe avec
 * `ethers.js` directement, sans avoir besoin d'une extension navigateur.
 *
 * Détail crucial pour l'interopérabilité : le message signé pour
 * dériver la clé AES est **exactement le même** que dans le flux wallet
 * externe (`getKeyDerivationMessage()`). Donc un fichier chiffré via le
 * wallet embarqué reste déchiffrable depuis MetaMask (même adresse →
 * même signature → même clé), et inversement.
 */
export function useEmbeddedFileLock() {
  const { wallets } = useWallets();
  const { requestUnlock, getWallet } = useEmbeddedWallet();
  const { address: FILE_LOCK_FACTORY_POLYGON } = useFactoryAddress(POLYGON_CHAIN_ID, 'file_lock');

  const embeddedWallet = wallets.find((w) => w.type === 'internal');

  /**
   * Déverrouille (ou réutilise) le wallet ethers embarqué.
   * Si le wallet est déjà déverrouillé en mémoire, on le réutilise ;
   * sinon on ouvre la modale de saisie du mot de passe.
   */
  const getConnectedWallet = useCallback(async (): Promise<ethers.Wallet | null> => {
    if (!embeddedWallet) return null;
    const existing = getWallet();
    if (existing) return existing;
    const ok = await requestUnlock(parseInt(embeddedWallet.id), embeddedWallet.address);
    return ok ? getWallet() : null;
  }, [embeddedWallet, getWallet, requestUnlock]);

  /**
   * Signe le message fixe de dérivation de clé. Cette signature alimente
   * le PBKDF2 qui produit la clé AES-256-GCM utilisée pour chiffrer le
   * fichier.
   */
  const signKeyDerivation = useCallback(async (): Promise<string> => {
    const wallet = await getConnectedWallet();
    if (!wallet) throw new Error('Impossible de déverrouiller le wallet embarqué');
    return wallet.signMessage(getKeyDerivationMessage());
  }, [getConnectedWallet]);

  /**
   * Crée un verrou de fichier on-chain via le wallet embarqué.
   * Renvoie une fois la transaction minée, avec le hash de tx et
   * l'adresse du Vault instancié par la Factory.
   */
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

      // Récupération de l'adresse du Vault via l'event FileLockCreated
      // émis par la Factory.
      let lockAddress = '';
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed?.name === 'FileLockCreated') {
            lockAddress = parsed.args?.lockAddress ?? '';
            break;
          }
        } catch {
          /* event non-Factory : on l'ignore */
        }
      }

      return { txHash: tx.hash, lockAddress };
    },
    [getConnectedWallet, FILE_LOCK_FACTORY_POLYGON],
  );

  /**
   * Marque le Vault comme déverrouillé on-chain. Étape optionnelle :
   * la clé AES peut être récupérée par lecture directe du contrat,
   * cet appel sert surtout à passer le statut on-chain à UNLOCKED.
   */
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

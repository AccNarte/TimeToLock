"use client";

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useEmbeddedWallet } from '@/contexts/embedded-wallet-context';
import { useWallets } from '@/hooks/use-wallets-query';
import { walletsService } from '@/lib/api/services/wallets.service';
import { getWalletFromEncrypted } from '@/lib/embedded-wallet';
import TimelockFactoryABI from '@/lib/contracts/TimelockFactory.json';
import TimelockVaultABI from '@/lib/contracts/TimelockVault.json';

// Contract addresses
const FACTORY_ADDRESS_POLYGON = process.env.NEXT_PUBLIC_CRYPTO_TIMELOCK_FACTORY_POLYGON || '';
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;

// ERC20 ABI (minimal for approve)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

export interface CreateLockParams {
  tokenAddress: string;
  amount: string;
  decimals: number;
  unlockTimestamp: number;
}

/**
 * Hook for timelock contract interactions using embedded wallet
 */
export function useEmbeddedTimelock() {
  const { wallets } = useWallets();
  const { requestUnlock, isUnlocked, getWallet } = useEmbeddedWallet();

  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lockAddress, setLockAddress] = useState<string | null>(null);

  // Get embedded wallet
  const embeddedWallet = wallets.find((w) => w.type === 'internal');

  /**
   * Get a connected ethers wallet for the embedded wallet
   */
  const getConnectedWallet = useCallback(async (): Promise<ethers.Wallet | null> => {
    if (!embeddedWallet) return null;

    // Check if already unlocked
    let wallet = getWallet();
    if (wallet) return wallet;

    // Request unlock via password
    const walletId = parseInt(embeddedWallet.id);
    const success = await requestUnlock(walletId, embeddedWallet.address);

    if (success) {
      return getWallet();
    }

    return null;
  }, [embeddedWallet, getWallet, requestUnlock]);

  /**
   * Approve tokens for the factory
   */
  const approveToken = useCallback(async (
    tokenAddress: string,
    amount: string,
    decimals: number
  ): Promise<string> => {
    setIsApproving(true);
    setError(null);
    setStep('Demande de mot de passe...');

    try {
      const wallet = await getConnectedWallet();
      if (!wallet) {
        throw new Error('Impossible de déverrouiller le wallet');
      }

      setStep('Approbation des tokens...');

      // Create contract instance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      const amountWei = ethers.parseUnits(amount, decimals);

      // Send approval transaction
      const tx = await tokenContract.approve(FACTORY_ADDRESS_POLYGON, amountWei);
      setTxHash(tx.hash);

      setStep('Attente de confirmation...');
      await tx.wait();

      setIsApproving(false);
      setStep('');
      return tx.hash;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'approbation');
      setIsApproving(false);
      setStep('');
      throw err;
    }
  }, [getConnectedWallet]);

  /**
   * Create a new timelock
   */
  const createLock = useCallback(async (params: CreateLockParams): Promise<{
    txHash: string;
    lockAddress: string;
  }> => {
    setIsCreating(true);
    setError(null);
    setStep('Demande de mot de passe...');

    try {
      const wallet = await getConnectedWallet();
      if (!wallet) {
        throw new Error('Impossible de déverrouiller le wallet');
      }

      setStep('Création du lock...');

      // Create factory contract instance
      const factoryContract = new ethers.Contract(
        FACTORY_ADDRESS_POLYGON,
        TimelockFactoryABI,
        wallet
      );

      const amountWei = ethers.parseUnits(params.amount, params.decimals);

      // Call createLock on factory
      const tx = await factoryContract.createLock(
        params.tokenAddress,
        amountWei,
        params.unlockTimestamp
      );
      setTxHash(tx.hash);

      setStep('Attente de confirmation...');
      const receipt = await tx.wait();

      // Parse LockCreated event to get lock address
      const lockCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = factoryContract.interface.parseLog(log);
          return parsed?.name === 'LockCreated';
        } catch {
          return false;
        }
      });

      let parsedLockAddress = '';
      if (lockCreatedEvent) {
        const parsed = factoryContract.interface.parseLog(lockCreatedEvent);
        parsedLockAddress = parsed?.args?.lockAddress || '';
      }

      setLockAddress(parsedLockAddress);
      setIsCreating(false);
      setStep('');

      return {
        txHash: tx.hash,
        lockAddress: parsedLockAddress,
      };
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du lock');
      setIsCreating(false);
      setStep('');
      throw err;
    }
  }, [getConnectedWallet]);

  /**
   * Withdraw from a timelock
   */
  const withdraw = useCallback(async (lockContractAddress: string): Promise<string> => {
    setIsWithdrawing(true);
    setError(null);
    setStep('Demande de mot de passe...');

    try {
      const wallet = await getConnectedWallet();
      if (!wallet) {
        throw new Error('Impossible de déverrouiller le wallet');
      }

      setStep('Retrait des fonds...');

      // Create vault contract instance
      const vaultContract = new ethers.Contract(
        lockContractAddress,
        TimelockVaultABI,
        wallet
      );

      // Call withdraw
      const tx = await vaultContract.withdraw();
      setTxHash(tx.hash);

      setStep('Attente de confirmation...');
      await tx.wait();

      setIsWithdrawing(false);
      setStep('');
      return tx.hash;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du retrait');
      setIsWithdrawing(false);
      setStep('');
      throw err;
    }
  }, [getConnectedWallet]);

  /**
   * Check token allowance
   */
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    ownerAddress: string
  ): Promise<bigint> => {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    return tokenContract.allowance(ownerAddress, FACTORY_ADDRESS_POLYGON);
  }, []);

  return {
    // State
    isApproving,
    isCreating,
    isWithdrawing,
    step,
    error,
    txHash,
    lockAddress,
    factoryAddress: FACTORY_ADDRESS_POLYGON,
    chainId: POLYGON_CHAIN_ID,
    hasEmbeddedWallet: !!embeddedWallet,
    embeddedWalletAddress: embeddedWallet?.address || null,

    // Actions
    approveToken,
    createLock,
    withdraw,
    checkAllowance,
  };
}

"use client";

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { Address, parseEventLogs, Hex } from 'viem';
import FileLockFactoryABI from '@/lib/contracts/FileLockFactory.json';
import FileLockVaultABI from '@/lib/contracts/FileLockVault.json';
import { useFactoryAddress } from '@/hooks/use-factory-address';

const POLYGON_CHAIN_ID = 137;

// Lock status enum matching the smart contract
export enum FileLockStatus {
  LOCKED = 0,
  UNLOCKABLE = 1,
  UNLOCKED = 2,
}

export interface CreateFileLockParams {
  ipfsHash: string;
  encryptedKey: Hex; // AES key encrypted with wallet signature
  unlockTimestamp: number; // Unix timestamp
}

export function useFileLockContract() {
  const { address, chainId } = useAccount();
  const [step, setStep] = useState<string>('');
  const [lockAddress, setLockAddress] = useState<Address | null>(null);
  const { address: FILE_LOCK_FACTORY_POLYGON } = useFactoryAddress(POLYGON_CHAIN_ID, 'file_lock');

  // Write contract for creating a file lock
  const {
    writeContract: writeCreateFileLock,
    data: createFileLockHash,
    isPending: isCreating,
    error: createError
  } = useWriteContract();

  // Write contract for retrieving the key (marks as UNLOCKED)
  const {
    writeContract: writeRetrieveKey,
    data: retrieveKeyHash,
    isPending: isRetrievingKey,
    error: retrieveKeyError
  } = useWriteContract();

  // Wait for create transaction
  const {
    isLoading: isCreateTxLoading,
    isSuccess: isCreateTxSuccess,
    data: createReceipt
  } = useWaitForTransactionReceipt({
    hash: createFileLockHash,
  });

  // Wait for retrieve key transaction
  const {
    isLoading: isRetrieveKeyTxLoading,
    isSuccess: isRetrieveKeyTxSuccess,
    data: retrieveKeyReceipt
  } = useWaitForTransactionReceipt({
    hash: retrieveKeyHash,
  });

  /**
   * Create a new file lock
   */
  const createFileLock = async (params: CreateFileLockParams) => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    if (!FILE_LOCK_FACTORY_POLYGON) {
      throw new Error('FileLock Factory address not configured');
    }

    setStep('Creating file lock on blockchain...');

    writeCreateFileLock({
      address: FILE_LOCK_FACTORY_POLYGON,
      abi: FileLockFactoryABI,
      functionName: 'createFileLock',
      args: [params.ipfsHash, params.encryptedKey, BigInt(params.unlockTimestamp)],
    });
  };

  /**
   * Retrieve encryption key from vault (marks as UNLOCKED)
   */
  const retrieveKey = async (vaultAddress: Address) => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    setStep('Retrieving encryption key from blockchain...');

    writeRetrieveKey({
      address: vaultAddress,
      abi: FileLockVaultABI,
      functionName: 'retrieveKey',
    });
  };

  /**
   * Parse lock address from transaction receipt
   */
  const parseLockAddress = (receipt: any): Address | null => {
    if (!receipt) return null;

    try {
      const logs = parseEventLogs({
        abi: FileLockFactoryABI,
        logs: receipt.logs,
        eventName: 'FileLockCreated',
      });

      if (logs.length > 0) {
        // Cast to access args property
        const log = logs[0] as { args?: { lockAddress?: Address } };
        if (log.args?.lockAddress) {
          const lockAddr = log.args.lockAddress;
          setLockAddress(lockAddr);
          return lockAddr;
        }
      }
    } catch (error) {
      console.error('Failed to parse lock address:', error);
    }

    return null;
  };

  /**
   * Get lock status
   */
  const { data: lockStatus } = useReadContract({
    address: lockAddress || undefined,
    abi: FileLockVaultABI,
    functionName: 'getStatus',
    query: {
      enabled: !!lockAddress,
    },
  });

  return {
    // Create File Lock
    createFileLock,
    isCreating: isCreating || isCreateTxLoading,
    isCreateSuccess: isCreateTxSuccess,
    createFileLockHash,
    createReceipt,
    createError,
    parseLockAddress,

    // Retrieve Key
    retrieveKey,
    isRetrievingKey: isRetrievingKey || isRetrieveKeyTxLoading,
    isRetrieveKeySuccess: isRetrieveKeyTxSuccess,
    retrieveKeyHash,
    retrieveKeyReceipt,
    retrieveKeyError,

    // Status
    lockAddress,
    lockStatus: lockStatus as FileLockStatus | undefined,
    step,
    setStep,

    // Config
    factoryAddress: FILE_LOCK_FACTORY_POLYGON,
    chainId: POLYGON_CHAIN_ID,
  };
}

/**
 * Hook to read file lock vault details
 */
export function useFileLockDetails(lockAddress: Address | null) {
  const { data: details } = useReadContract({
    address: lockAddress || undefined,
    abi: FileLockVaultABI,
    functionName: 'getLockDetails',
    query: {
      enabled: !!lockAddress,
    },
  });

  const { data: status } = useReadContract({
    address: lockAddress || undefined,
    abi: FileLockVaultABI,
    functionName: 'getStatus',
    query: {
      enabled: !!lockAddress,
    },
  });

  const { data: timeUntilUnlock } = useReadContract({
    address: lockAddress || undefined,
    abi: FileLockVaultABI,
    functionName: 'getTimeUntilUnlock',
    query: {
      enabled: !!lockAddress,
    },
  });

  if (!details || !lockAddress) {
    return null;
  }

  const [owner, ipfsHash, unlockTime, keyRetrieved] = details as [Address, string, bigint, boolean];

  return {
    owner,
    ipfsHash,
    unlockTime: Number(unlockTime),
    keyRetrieved,
    status: status as FileLockStatus,
    timeUntilUnlock: timeUntilUnlock ? Number(timeUntilUnlock) : 0,
    address: lockAddress,
  };
}

/**
 * Hook to get encryption key from vault (view function - doesn't modify state)
 */
export function useFileLockEncryptionKey(lockAddress: Address | null, enabled: boolean = false) {
  const { data: encryptedKey, error, refetch } = useReadContract({
    address: lockAddress || undefined,
    abi: FileLockVaultABI,
    functionName: 'getEncryptionKey',
    query: {
      enabled: enabled && !!lockAddress,
    },
  });

  return {
    encryptedKey: encryptedKey as Hex | undefined,
    error,
    refetchKey: refetch,
  };
}

/**
 * Hook to get user's file locks from factory
 */
export function useUserFileLocks(userAddress: Address | undefined) {
  const { address: FILE_LOCK_FACTORY_POLYGON } = useFactoryAddress(POLYGON_CHAIN_ID, 'file_lock');

  const { data: locks, refetch, isLoading } = useReadContract({
    address: FILE_LOCK_FACTORY_POLYGON || undefined,
    abi: FileLockFactoryABI,
    functionName: 'getUserLocks',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!FILE_LOCK_FACTORY_POLYGON && !!userAddress,
    },
  });

  return {
    lockAddresses: locks as Address[] | undefined,
    refetchLocks: refetch,
    isLoading,
  };
}

/**
 * Hook to read encrypted key directly from vault (public getter)
 * This reads the `encryptedKey` public variable directly, which has no access restrictions
 */
export function useReadEncryptedKey() {
  const publicClient = usePublicClient();

  const readEncryptedKey = useCallback(async (vaultAddress: Address): Promise<Hex> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const encryptedKey = await publicClient.readContract({
      address: vaultAddress,
      abi: FileLockVaultABI,
      functionName: 'encryptedKey',
    });

    return encryptedKey as Hex;
  }, [publicClient]);

  const readVaultStatus = useCallback(async (vaultAddress: Address): Promise<FileLockStatus> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const status = await publicClient.readContract({
      address: vaultAddress,
      abi: FileLockVaultABI,
      functionName: 'getStatus',
    });

    return status as FileLockStatus;
  }, [publicClient]);

  return {
    readEncryptedKey,
    readVaultStatus,
  };
}

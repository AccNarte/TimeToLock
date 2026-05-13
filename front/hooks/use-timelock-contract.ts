"use client";

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, Address, parseEventLogs, erc20Abi } from 'viem';
import TimelockFactoryABI from '@/lib/contracts/TimelockFactory.json';
import TimelockVaultABI from '@/lib/contracts/TimelockVault.json';

// Crypto TimeLock Factory address on Polygon
const FACTORY_ADDRESS_POLYGON = (process.env.NEXT_PUBLIC_CRYPTO_TIMELOCK_FACTORY_POLYGON || '') as Address;
const POLYGON_CHAIN_ID = 137;

export interface CreateLockParams {
  tokenAddress: Address;
  amount: string; // in token units (e.g., "100" for 100 USDC)
  decimals: number;
  unlockTimestamp: number; // Unix timestamp
}

export function useTimelockContract() {
  const { address, chainId } = useAccount();
  const [step, setStep] = useState<string>('');
  const [lockAddress, setLockAddress] = useState<Address | null>(null);

  // Write contracts
  const {
    writeContractAsync: writeApproveAsync,
    data: approveHash,
    isPending: isApproving,
    error: approveError
  } = useWriteContract();

  const {
    writeContractAsync: writeCreateLockAsync,
    data: createLockHash,
    isPending: isCreating,
    error: createError
  } = useWriteContract();

  const {
    writeContractAsync: writeWithdrawAsync,
    data: withdrawHash,
    isPending: isWithdrawing,
    error: withdrawError
  } = useWriteContract();

  // Wait for transactions
  const {
    isLoading: isApproveTxLoading,
    isSuccess: isApproveTxSuccess
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const {
    isLoading: isCreateTxLoading,
    isSuccess: isCreateTxSuccess,
    data: createReceipt
  } = useWaitForTransactionReceipt({
    hash: createLockHash,
  });

  const {
    isLoading: isWithdrawTxLoading,
    isSuccess: isWithdrawTxSuccess
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  /**
   * Approve tokens for the factory
   */
  const approveToken = async (tokenAddress: Address, amount: string, decimals: number) => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    if (!FACTORY_ADDRESS_POLYGON) {
      throw new Error('Factory address not configured');
    }

    setStep('Approving tokens...');
    const amountWei = parseUnits(amount, decimals);

    console.log('Approving tokens:', { tokenAddress, amount, amountWei, factory: FACTORY_ADDRESS_POLYGON });

    return writeApproveAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [FACTORY_ADDRESS_POLYGON, amountWei],
    });
  };

  /**
   * Create a new timelock
   */
  const createLock = async (params: CreateLockParams) => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    if (!FACTORY_ADDRESS_POLYGON) {
      throw new Error('Factory address not configured');
    }

    setStep('Creating lock...');
    const amountWei = parseUnits(params.amount, params.decimals);

    console.log('Creating lock:', { params, amountWei, factory: FACTORY_ADDRESS_POLYGON });

    return writeCreateLockAsync({
      address: FACTORY_ADDRESS_POLYGON,
      abi: TimelockFactoryABI,
      functionName: 'createLock',
      args: [params.tokenAddress, amountWei, BigInt(params.unlockTimestamp)],
    });
  };

  /**
   * Withdraw from a lock
   */
  const withdraw = async (vaultAddress: Address) => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    setStep('Withdrawing...');

    console.log('Withdrawing from vault:', vaultAddress);

    return writeWithdrawAsync({
      address: vaultAddress,
      abi: TimelockVaultABI,
      functionName: 'withdraw',
    });
  };

  /**
   * Parse lock address from transaction receipt
   */
  const parseLockAddress = (receipt: any): Address | null => {
    if (!receipt) return null;

    try {
      const logs = parseEventLogs({
        abi: TimelockFactoryABI,
        logs: receipt.logs,
        eventName: 'LockCreated',
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
    abi: TimelockVaultABI,
    functionName: 'getStatus',
    query: {
      enabled: !!lockAddress,
    },
  });

  return {
    // Approve
    approveToken,
    isApproving: isApproving || isApproveTxLoading,
    isApproveSuccess: isApproveTxSuccess,
    approveHash,
    approveError,

    // Create Lock
    createLock,
    isCreating: isCreating || isCreateTxLoading,
    isCreateSuccess: isCreateTxSuccess,
    createLockHash,
    createReceipt,
    createError,
    parseLockAddress,

    // Withdraw
    withdraw,
    isWithdrawing: isWithdrawing || isWithdrawTxLoading,
    isWithdrawSuccess: isWithdrawTxSuccess,
    withdrawHash,
    withdrawError,

    // Status
    lockAddress,
    lockStatus,
    step,
    setStep,

    // Config
    factoryAddress: FACTORY_ADDRESS_POLYGON,
    chainId: POLYGON_CHAIN_ID,
  };
}

/**
 * Hook to read lock details
 */
export function useLockDetails(lockAddress: Address | null) {
  const { data: details } = useReadContract({
    address: lockAddress || undefined,
    abi: TimelockVaultABI,
    functionName: 'getLockDetails',
    query: {
      enabled: !!lockAddress,
    },
  });

  const { data: status } = useReadContract({
    address: lockAddress || undefined,
    abi: TimelockVaultABI,
    functionName: 'getStatus',
    query: {
      enabled: !!lockAddress,
    },
  });

  if (!details || !lockAddress) {
    return null;
  }

  const [owner, token, amount, unlockTime, withdrawn] = details as [Address, Address, bigint, bigint, boolean];

  return {
    owner,
    token,
    amount,
    unlockTime: Number(unlockTime),
    withdrawn,
    status: status as number,
    address: lockAddress,
  };
}

/**
 * Hook to check token allowance
 */
export function useTokenAllowance(tokenAddress: Address | null, owner: Address | undefined) {
  const { data: allowance, refetch } = useReadContract({
    address: tokenAddress || undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && FACTORY_ADDRESS_POLYGON ? [owner, FACTORY_ADDRESS_POLYGON] : undefined,
    query: {
      enabled: !!tokenAddress && !!owner && !!FACTORY_ADDRESS_POLYGON,
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    refetchAllowance: refetch,
  };
}

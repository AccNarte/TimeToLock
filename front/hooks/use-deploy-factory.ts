"use client";

import { useState } from 'react';
import { useAccount, useDeployContract, useWaitForTransactionReceipt } from 'wagmi';
import TimelockFactoryBytecode from '@/lib/contracts/TimelockFactory-bytecode.json';
import TimelockFactoryABI from '@/lib/contracts/TimelockFactory.json';

const POLYGON_CHAIN_ID = 137;

export function useDeployFactory() {
  const { address, chainId } = useAccount();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const {
    deployContract,
    data: hash,
    isPending,
    error
  } = useDeployContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash,
  });

  const deploy = async () => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    try {
      deployContract({
        abi: TimelockFactoryABI,
        bytecode: TimelockFactoryBytecode.bytecode as `0x${string}`,
      });
    } catch (err: any) {
      console.error('Deploy error:', err);
      throw err;
    }
  };

  // Extract deployed address from receipt
  if (isConfirmed && receipt && !deployedAddress) {
    const addr = receipt.contractAddress;
    if (addr) {
      setDeployedAddress(addr);
    }
  }

  return {
    deploy,
    isPending,
    isConfirming,
    isConfirmed,
    deployedAddress,
    hash,
    error,
    isDeploying: isPending || isConfirming,
  };
}

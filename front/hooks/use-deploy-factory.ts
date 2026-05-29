"use client";

import { useState } from 'react';
import { useAccount, useDeployContract, useWaitForTransactionReceipt } from 'wagmi';
import TimelockFactoryBytecode from '@/lib/contracts/TimelockFactory-bytecode.json';
import TimelockFactoryABI from '@/lib/contracts/TimelockFactory.json';
import FileLockFactoryBytecode from '@/lib/contracts/FileLockFactory-bytecode.json';
import FileLockFactoryABI from '@/lib/contracts/FileLockFactory.json';

const POLYGON_CHAIN_ID = 137;

export type DeployableFactoryType = 'crypto_timelock' | 'file_lock';

const FACTORY_CONFIGS: Record<DeployableFactoryType, { abi: any; bytecode: `0x${string}`; label: string }> = {
  crypto_timelock: {
    abi: TimelockFactoryABI,
    bytecode: TimelockFactoryBytecode.bytecode as `0x${string}`,
    label: 'TimelockFactory (crypto)',
  },
  file_lock: {
    abi: FileLockFactoryABI,
    bytecode: FileLockFactoryBytecode.bytecode as `0x${string}`,
    label: 'FileLockFactory (fichiers)',
  },
};

export function useDeployFactory() {
  const { address, chainId } = useAccount();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [lastDeployedType, setLastDeployedType] = useState<DeployableFactoryType | null>(null);

  const {
    deployContract,
    data: hash,
    isPending,
    error,
    reset: resetDeploy,
  } = useDeployContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash,
  });

  const deploy = async (factoryType: DeployableFactoryType = 'crypto_timelock') => {
    if (!address || chainId !== POLYGON_CHAIN_ID) {
      throw new Error('Please connect to Polygon network');
    }

    const config = FACTORY_CONFIGS[factoryType];
    if (!config) {
      throw new Error(`Unknown factory type: ${factoryType}`);
    }

    setLastDeployedType(factoryType);
    setDeployedAddress(null);

    try {
      deployContract({
        abi: config.abi,
        bytecode: config.bytecode,
        // Both factories have a no-arg constructor. wagmi's type can't infer
        // that from `abi: any`, so it demands `args` — pass an empty tuple.
        args: [],
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
    deployedType: lastDeployedType,
    hash,
    error,
    isDeploying: isPending || isConfirming,
    factoryConfigs: FACTORY_CONFIGS,
    resetDeploy,
  };
}

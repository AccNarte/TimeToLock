'use client';

// Re-export wagmi hooks for Web3 functionality
export {
  useAccount,
  useDisconnect,
  useSignMessage,
  useBalance,
  useChainId,
  useSwitchChain,
  useConnect,
  useConnectors,
} from 'wagmi';

// Re-export RainbowKit hooks
export { useConnectModal, useAccountModal, useChainModal } from '@rainbow-me/rainbowkit';

// Custom hook for wallet address formatting
export function useFormattedAddress() {
  const { address, isConnected } = useAccountHook();
  
  const formatted = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;
  
  return {
    address,
    formatted,
    isConnected,
  };
}

// Import for internal use
import { useAccount as useAccountHook } from 'wagmi';



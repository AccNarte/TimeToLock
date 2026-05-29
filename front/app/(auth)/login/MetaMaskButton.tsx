"use client";

import { useState, useEffect, useRef } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useConnect, useAccount, useSignMessage, useChainId } from 'wagmi';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api';

interface MetaMaskButtonProps {
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function MetaMaskButton({ onError, disabled }: MetaMaskButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const hasProcessedAuthRef = useRef(false);
  const connectModal = useConnectModal();
  const openConnectModal = connectModal?.openConnectModal;
  const { connect, connectors, isPending: isWagmiConnecting } = useConnect();
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { login } = useAuth();
  const router = useRouter();

  // Watch for connection and handle authentication
  useEffect(() => {
    const handleWalletAuth = async () => {
      if (!isConnected || !address) {
        hasProcessedAuthRef.current = false;
        return;
      }

      // Prevent multiple authentication attempts
      if (hasProcessedAuthRef.current) {
        return;
      }

      setIsConnecting(false);
      setIsSigning(true);
      hasProcessedAuthRef.current = true;

      try {
        // Wait for connector and chainId to be ready
        if (!connector || !chainId) {
          setIsSigning(false);
          hasProcessedAuthRef.current = false;
          return;
        }

        // Create a message to sign
        const message = `Sign this message to authenticate with TimeLock.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

        // Request signature using wagmi's signMessageAsync
        const signature = await signMessageAsync({ message });

        // Try to authenticate with backend
        const response = await authService.walletLogin({
          address,
          signature,
          message,
        });

        // Handle successful authentication
        // Note: access_token is now in HTTP-only cookie, check for user instead
        if (response.user) {
          authService.setUser(response.user);
          router.push('/dashboard');
        } else {
          onError?.('L\'authentification par wallet a échoué. Veuillez réessayer.');
          hasProcessedAuthRef.current = false;
        }
      } catch (apiError: any) {
        const backendMessage = apiError.response?.data?.message || apiError.message;
        const statusCode = apiError.response?.status;

        if (statusCode === 404) {
          onError?.('Endpoint /auth/wallet-login n\'existe pas encore dans le backend');
        } else if (apiError.request && !apiError.response) {
          onError?.('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 3011.');
        } else if (apiError.code === 4001) {
          onError?.('Signature refusée. Veuillez autoriser la signature dans MetaMask.');
        } else {
          onError?.(backendMessage || 'Erreur lors de l\'authentification. Veuillez réessayer.');
        }

        hasProcessedAuthRef.current = false;
      } finally {
        setIsSigning(false);
      }
    };

    handleWalletAuth();
  }, [isConnected, address, connector, chainId, signMessageAsync, router]);

  // Handle MetaMask connection
  const handleMetaMaskConnect = async () => {
    console.log('🚀 Starting MetaMask connection...');
    setIsConnecting(true);
    
    try {
      // Try to use RainbowKit modal first
      if (openConnectModal) {
        console.log('📱 Using RainbowKit modal...');
        openConnectModal();
        // Don't set isConnecting to false here, wait for connection
        return;
      }

      // Fallback: Connect directly to MetaMask using wagmi
      console.log('🔄 Falling back to direct MetaMask connection...');
      const metaMaskConnector = connectors.find(
        (connector) => connector.id === 'metaMask' || connector.id === 'injected'
      );

      if (metaMaskConnector) {
        console.log('✅ Found MetaMask connector:', metaMaskConnector.id);
        connect({ connector: metaMaskConnector });
        // Don't set isConnecting to false here, wait for connection
      } else {
        console.warn('⚠️ No MetaMask connector found. Available connectors:', connectors.map(c => c.id));
        // Last resort: try to connect via window.ethereum directly
        if (typeof window !== 'undefined' && window.ethereum) {
          console.log('🔌 Connecting via window.ethereum...');
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('✅ MetaMask connection successful. Accounts:', accounts);
          setIsConnecting(false);
        } else {
          console.error('❌ MetaMask not detected');
          const errorMsg = 'MetaMask n\'est pas détecté. Veuillez installer l\'extension MetaMask.';
          onError?.(errorMsg);
          setIsConnecting(false);
        }
      }
    } catch (err: any) {
      console.error('❌ Error connecting to MetaMask:', err);
      let errorMsg = 'Erreur lors de la connexion à MetaMask. Veuillez réessayer.';
      
      if (err.code === 4001) {
        errorMsg = 'Connexion refusée. Veuillez autoriser l\'accès à MetaMask.';
      } else if (err.code === -32002) {
        errorMsg = 'Une demande de connexion est déjà en cours. Vérifiez MetaMask.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      onError?.(errorMsg);
      setIsConnecting(false);
    }
  };

  const isConnectingState = isConnecting || isWagmiConnecting || isSigning;

  return (
    <Button
      type="button"
      onClick={handleMetaMaskConnect}
      className="w-full h-11 bg-[#F6851B] hover:bg-[#E2761B] text-white font-medium text-sm mb-5 transition-colors"
      disabled={disabled || isConnectingState || isConnected}
    >
      <Wallet className="w-6 h-6 mr-3" />
      {isSigning ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Signature en cours...
        </>
      ) : isConnectingState ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Connexion en cours...
        </>
      ) : isConnected ? (
        'Connecté'
      ) : (
        'Se connecter avec MetaMask'
      )}
    </Button>
  );
}


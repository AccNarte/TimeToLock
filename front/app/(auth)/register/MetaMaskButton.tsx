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
  const connectModal = useConnectModal();
  const openConnectModal = connectModal?.openConnectModal;
  const { connect, connectors, isPending: isWagmiConnecting } = useConnect();
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { login: authContextLogin } = useAuth();
  const router = useRouter();
  const hasProcessedAuth = useRef(false);

  // Watch for connection and handle authentication
  useEffect(() => {
    const handleWalletAuth = async () => {
      if (!isConnected || !address || hasProcessedAuth.current) {
        console.log('🔍 Wallet not connected yet or auth already processed. isConnected:', isConnected, 'address:', address, 'hasProcessedAuth:', hasProcessedAuth.current);
        return;
      }

      hasProcessedAuth.current = true;
      console.log('✅ Wallet connected! Address:', address);
      setIsConnecting(false);
      setIsSigning(true);

      try {
        // Wait for connector and chainId to be ready
        if (!connector || !chainId) {
          console.log('⏳ Waiting for connector and chainId to be ready...', { connector: !!connector, chainId });
          return;
        }

        // Create a message to sign
        const message = `Sign this message to authenticate with TimeLock.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
        console.log('📝 Requesting signature for message:', message);

        // Request signature using wagmi's signMessageAsync
        // This should work now that we've verified connector and chainId are ready
        const signature = await signMessageAsync({ message });
        console.log('✅ Signature received:', signature);

        console.log('📤 Ready to send to backend:', {
          address,
          signature,
          message,
        });

        try {
          console.log('Calling backend at:', `${process.env.NEXT_PUBLIC_API_URL}/auth/wallet-login`);
          const response = await authService.walletLogin({
            address,
            signature,
            message,
          });

          if (response.user) {
            console.log('✅ Backend authentication successful:', response);
            // Token is now set in HTTP-only cookie by the backend
            authService.setUser(response.user);
            router.push('/dashboard');
          } else {
            console.warn('⚠️ Backend authentication failed: No user received.');
            onError?.('L\'authentification par wallet a échoué. Veuillez réessayer.');
          }
        } catch (apiError: any) {
          console.error('❌ Error calling backend:', apiError);
          const backendMessage = apiError.response?.data?.message || apiError.message;
          const statusCode = apiError.response?.status;
          console.log('💡 Backend response:', statusCode, backendMessage);
          if (statusCode === 404) {
            onError?.('Endpoint /auth/wallet-login does not exist yet in the backend');
          } else {
            onError?.(backendMessage || 'Impossible de se connecter au serveur. Vérifiez votre connexion.');
          }
        }
      } catch (signError: any) {
        console.error('❌ Error signing message:', signError);
        let errorMsg = 'Erreur lors de la signature. Veuillez réessayer.';
        
        if (signError.code === 4001) {
          errorMsg = 'Signature refusée. Veuillez autoriser la signature dans MetaMask.';
        } else if (signError.message) {
          errorMsg = signError.message;
        }
        
        onError?.(errorMsg);
      } finally {
        setIsSigning(false);
        hasProcessedAuth.current = false;
      }
    };

    handleWalletAuth();
  }, [isConnected, address, connector, chainId, signMessageAsync, onError, router, authContextLogin]);

  // Handle MetaMask connection
  const handleMetaMaskConnect = async () => {
    console.log('🚀 Starting MetaMask connection...');
    setIsConnecting(true);
    
    try {
      // Try to use RainbowKit modal first
      if (openConnectModal) {
        console.log('📱 Using RainbowKit modal...');
        openConnectModal();
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
      } else {
        console.warn('⚠️ No MetaMask connector found. Available connectors:', connectors.map(c => c.id));
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
      className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg mb-6 shadow-lg hover:shadow-xl transition-all duration-300"
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
        "S'inscrire avec MetaMask"
      )}
    </Button>
  );
}



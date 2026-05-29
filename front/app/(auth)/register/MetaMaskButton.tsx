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

/**
 * Bouton d'inscription par wallet sur la page Register.
 *
 * Côté API, l'inscription par wallet est gérée par le même endpoint que la
 * connexion (`POST /auth/wallet-login`) : si le wallet n'a pas encore de
 * compte associé, le backend crée automatiquement un utilisateur dont
 * l'email est `wallet_<adresse>@timelock.local`.
 *
 * Différences fonctionnelles vs le bouton de Login :
 *   - Style visuel plus mis en avant (gradient, taille).
 *   - Libellé « S'inscrire » au lieu de « Se connecter ».
 *   - Même flux technique : connexion wallet → signature d'un message
 *     horodaté → envoi au backend → cookie JWT HttpOnly → /dashboard.
 */
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
  // Évite de relancer la signature à chaque re-render du useEffect (le
  // connector et le chainId arrivent souvent juste après l'adresse).
  const hasProcessedAuth = useRef(false);

  // Une fois le wallet connecté, on enchaîne automatiquement signature + auth.
  useEffect(() => {
    const handleWalletAuth = async () => {
      if (!isConnected || !address || hasProcessedAuth.current) {
        return;
      }

      hasProcessedAuth.current = true;
      setIsConnecting(false);
      setIsSigning(true);

      try {
        // Le connector et le chainId peuvent arriver après l'adresse — on patiente.
        if (!connector || !chainId) {
          return;
        }

        // Message à signer (adresse + timestamp anti-rejeu côté backend).
        const message = `Sign this message to authenticate with TimeLock.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

        // Demande de signature au wallet.
        const signature = await signMessageAsync({ message });

        try {
          // Envoi au backend : il vérifie la signature et crée le compte si
          // l'adresse n'en a pas encore.
          const response = await authService.walletLogin({
            address,
            signature,
            message,
          });

          if (response.user) {
            // Le JWT est posé en cookie HttpOnly par le backend.
            authService.setUser(response.user);
            router.push('/dashboard');
          } else {
            onError?.('L\'authentification par wallet a échoué. Veuillez réessayer.');
          }
        } catch (apiError: any) {
          const backendMessage = apiError.response?.data?.message || apiError.message;
          const statusCode = apiError.response?.status;
          if (statusCode === 404) {
            onError?.('Endpoint /auth/wallet-login does not exist yet in the backend');
          } else {
            onError?.(backendMessage || 'Impossible de se connecter au serveur. Vérifiez votre connexion.');
          }
        }
      } catch (signError: any) {
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

  /**
   * Lance la connexion : modale RainbowKit en priorité, connecteur MetaMask
   * direct en fallback, requête brute à window.ethereum en dernier recours.
   */
  const handleMetaMaskConnect = async () => {
    setIsConnecting(true);

    try {
      // Priorité : modale RainbowKit (gère MetaMask, Rabby, WalletConnect…).
      if (openConnectModal) {
        openConnectModal();
        return;
      }

      // Fallback : connecteur MetaMask direct via wagmi.
      const metaMaskConnector = connectors.find(
        (c) => c.id === 'metaMask' || c.id === 'injected',
      );

      if (metaMaskConnector) {
        connect({ connector: metaMaskConnector });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        // Dernier recours : requête directe à window.ethereum.
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnecting(false);
      } else {
        onError?.('MetaMask n\'est pas détecté. Veuillez installer l\'extension MetaMask.');
        setIsConnecting(false);
      }
    } catch (err: any) {
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

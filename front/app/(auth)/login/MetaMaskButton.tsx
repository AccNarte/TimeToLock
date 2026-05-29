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
 * Bouton de connexion par wallet sur la page Login.
 *
 * Flux complet :
 *   1. L'utilisateur clique → on ouvre la modale RainbowKit (ou on retombe
 *      directement sur le connecteur MetaMask si RainbowKit n'est pas dispo).
 *   2. Une fois le wallet connecté (`isConnected` passe à true), un `useEffect`
 *      enchaîne la demande de signature d'un message horodaté.
 *   3. La signature est envoyée au backend (`POST /auth/wallet-login`) qui
 *      vérifie la signature et renvoie un JWT en cookie HttpOnly.
 *   4. On stocke l'utilisateur en contexte et on redirige vers /dashboard.
 */
export function MetaMaskButton({ onError, disabled }: MetaMaskButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  // Garde contre les doubles authentifications quand `useEffect` se relance
  // (changements multiples de connector/chainId pendant le handshake).
  const hasProcessedAuthRef = useRef(false);
  const connectModal = useConnectModal();
  const openConnectModal = connectModal?.openConnectModal;
  const { connect, connectors, isPending: isWagmiConnecting } = useConnect();
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { login } = useAuth();
  const router = useRouter();

  // Écoute l'état de connexion du wallet et déclenche la signature + auth
  // dès qu'une adresse est disponible.
  useEffect(() => {
    const handleWalletAuth = async () => {
      if (!isConnected || !address) {
        hasProcessedAuthRef.current = false;
        return;
      }

      // Anti-rejeu interne : si on a déjà lancé la signature, on ne recommence pas.
      if (hasProcessedAuthRef.current) {
        return;
      }

      setIsConnecting(false);
      setIsSigning(true);
      hasProcessedAuthRef.current = true;

      try {
        // Le connector et le chainId arrivent parfois après l'adresse — on attend.
        if (!connector || !chainId) {
          setIsSigning(false);
          hasProcessedAuthRef.current = false;
          return;
        }

        // Message à signer : adresse + timestamp pour empêcher tout rejeu côté backend.
        const message = `Sign this message to authenticate with TimeLock.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

        // Demande de signature au wallet via wagmi.
        const signature = await signMessageAsync({ message });

        // Vérification de la signature + ouverture de session côté backend.
        const response = await authService.walletLogin({
          address,
          signature,
          message,
        });

        // Le JWT est posé en cookie HttpOnly par le backend, on vérifie juste
        // que la réponse contient bien l'utilisateur.
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

  /**
   * Lance la connexion : on essaye en priorité la modale RainbowKit (qui
   * gère MetaMask, Rabby, WalletConnect, etc.) et on retombe sur le connecteur
   * MetaMask direct si la modale n'est pas disponible.
   */
  const handleMetaMaskConnect = async () => {
    setIsConnecting(true);

    try {
      // Priorité : modale RainbowKit (la plus complète).
      if (openConnectModal) {
        openConnectModal();
        // On laisse `isConnecting` à true : c'est le useEffect ci-dessus qui
        // prendra le relais quand le wallet sera connecté.
        return;
      }

      // Fallback : connecteur MetaMask direct via wagmi.
      const metaMaskConnector = connectors.find(
        (c) => c.id === 'metaMask' || c.id === 'injected',
      );

      if (metaMaskConnector) {
        connect({ connector: metaMaskConnector });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        // Dernier recours : requête brute à window.ethereum.
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

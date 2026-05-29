'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect, useBalance, useChainId } from 'wagmi';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check, Network, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChainInfo } from '@/hooks/use-tokens';
import { useWallets } from '@/hooks/use-wallets-query';
import { getNativeBalance } from '@/lib/etherscan';
import { WrongNetworkPrompt } from '@/components/WrongNetworkPrompt';
import Link from 'next/link';

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const chainInfo = useChainInfo();
  const { wallets } = useWallets();

  // Check for embedded wallet
  const embeddedWallet = wallets.find((w) => w.type === 'internal');
  const hasEmbeddedWallet = !!embeddedWallet;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmbedded, setCopiedEmbedded] = useState(false);
  const [embeddedBalance, setEmbeddedBalance] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch embedded wallet balance on Polygon via Etherscan API
  useEffect(() => {
    if (hasEmbeddedWallet && embeddedWallet) {
      getNativeBalance(embeddedWallet.address)
        .then(setEmbeddedBalance)
        .catch((error) => {
          console.error('Failed to fetch embedded wallet balance:', error);
          setEmbeddedBalance(0);
        });
    }
  }, [hasEmbeddedWallet, embeddedWallet?.address]);

  const copyEmbeddedAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedEmbedded(true);
    setTimeout(() => setCopiedEmbedded(false), 2000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (address) {
      const explorerUrl = chainId === 137 
        ? `https://polygonscan.com/address/${address}`
        : chainId === 80002
        ? `https://amoy.polygonscan.com/address/${address}`
        : `https://etherscan.io/address/${address}`;
      window.open(explorerUrl, '_blank');
    }
  };

  // Not connected to external wallet - check for embedded wallet
  if (!isConnected) {
    // User has embedded wallet - show dropdown with full address
    if (hasEmbeddedWallet) {
      return (
        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 ${className}`}
          >
            <Shield className="w-4 h-4" />
            <span className="font-mono">
              {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0D2A3F] border border-glass-border rounded-lg shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
              {/* Header */}
              <div className="p-4 border-b border-glass-border bg-purple-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <p className="text-sm font-semibold text-purple-300">Wallet Embarqué</p>
                </div>
                <p className="text-xs text-text-muted">Réseau: Polygon (MATIC)</p>
              </div>

              {/* Full Address */}
              <div className="p-4 border-b border-glass-border">
                <p className="text-xs text-text-muted mb-2">Adresse complète</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-white break-all flex-1 bg-dark-blue p-2 rounded">
                    {embeddedWallet.address}
                  </p>
                  <button
                    onClick={() => copyEmbeddedAddress(embeddedWallet.address)}
                    className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors flex-shrink-0"
                    title="Copier l'adresse"
                  >
                    {copiedEmbedded ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Balance Warning */}
              <div className="p-4 border-b border-glass-border">
                <p className="text-xs text-text-muted mb-2">Solde POL (pour les gas fees)</p>
                {embeddedBalance !== null ? (
                  <div>
                    <p className={`text-lg font-bold ${embeddedBalance >= 1 ? 'text-success' : 'text-warning'}`}>
                      {embeddedBalance.toFixed(4)} POL
                    </p>
                    {embeddedBalance < 1 && (
                      <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/30">
                        <p className="text-xs text-warning">
                          ⚠️ Solde insuffisant pour les transactions.
                          Minimum recommandé : 1 POL
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Chargement...</p>
                )}
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => copyEmbeddedAddress(embeddedWallet.address)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors"
                >
                  {copiedEmbedded ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  <span className="text-sm">{copiedEmbedded ? 'Copié!' : 'Copier l\'adresse'}</span>
                </button>

                <button
                  onClick={() => {
                    window.open(`https://polygonscan.com/address/${embeddedWallet.address}`, '_blank');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">Voir sur PolygonScan</span>
                </button>

                <Link href="/wallets" onClick={() => setIsDropdownOpen(false)}>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm">Gérer le wallet</span>
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      );
    }

    // No wallet at all - show connect button
    return (
      <Button
        onClick={openConnectModal}
        disabled={isConnecting}
        className={`glass-button gap-2 ${className}`}
      >
        <Wallet className="w-4 h-4" />
        {isConnecting ? 'Connexion...' : 'Connecter Wallet'}
      </Button>
    );
  }

  // Connected state with dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`glass-button gap-2 ${className}`}
      >
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-mono">{formatAddress(address!)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0D2A3F] border border-glass-border rounded-lg shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
          {/* Network */}
          <div className="p-4 border-b border-glass-border space-y-2">
            <p className="text-xs text-text-muted mb-1">Réseau</p>
            <div className="flex items-center gap-2">
              <Network className={`w-4 h-4 ${chainInfo.supported ? 'text-cyan-neon' : 'text-warning'}`} />
              <p className={`text-sm font-semibold ${chainInfo.supported ? 'text-white' : 'text-warning'}`}>
                {chainInfo.name}
              </p>
              {chainInfo.testnet && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">
                  Testnet
                </span>
              )}
              {!chainInfo.supported && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">
                  Non supporté
                </span>
              )}
            </div>
            {!chainInfo.supported && <WrongNetworkPrompt variant="compact" className="w-full justify-center" />}
          </div>

          {/* Balance */}
          <div className="p-4 border-b border-glass-border">
            <p className="text-xs text-text-muted mb-1">Solde</p>
            <p className="text-lg font-bold text-white">
              {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}
            </p>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? 'Copié!' : 'Copier l\'adresse'}</span>
            </button>

            <button
              onClick={openExplorer}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Voir sur l'explorer</span>
            </button>

            <button
              onClick={openAccountModal}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Détails du compte</span>
            </button>

            <div className="my-2 border-t border-glass-border" />

            <button
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletButton;



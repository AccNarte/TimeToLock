"use client";

import { useState, useEffect } from 'react';
import { FileText, Bitcoin, Wallet, Activity, Loader2, Link2, Shield, Key, Copy, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallets } from '@/hooks/use-wallets-query';
import { useFiles } from '@/hooks/use-files-query';
import { useCryptoLocks } from '@/hooks/use-crypto-locks-query';
import { useAudit } from '@/hooks/use-audit-query';
import { formatDate, formatWalletAddress } from '@/lib/formatters';
import { useAccount, useBalance, useChainId } from '@/hooks/use-web3';
import { useTokenBalances, useChainInfo } from '@/hooks/use-tokens';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { getNativeBalance } from '@/lib/etherscan';
import { WrongNetworkPrompt } from '@/components/WrongNetworkPrompt';
import Link from 'next/link';

export default function DashboardPage() {
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { files, isLoading: filesLoading } = useFiles();
  const { locks, isLoading: cryptoLoading } = useCryptoLocks();
  const { logs, isLoading: auditLoading } = useAudit();
  
  // Web3 hooks
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { tokens, isLoading: tokensLoading } = useTokenBalances();
  const chainInfo = useChainInfo();
  const { openConnectModal } = useConnectModal();

  // Find embedded wallet
  const embeddedWallet = wallets.find((w) => w.type === 'internal');
  const hasEmbeddedWallet = !!embeddedWallet;

  // State for embedded wallet
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [embeddedGasBalance, setEmbeddedGasBalance] = useState<number | null>(null);

  // Fetch gas balance for embedded wallet via Etherscan API
  useEffect(() => {
    if (hasEmbeddedWallet && embeddedWallet) {
      getNativeBalance(embeddedWallet.address)
        .then(setEmbeddedGasBalance)
        .catch((error) => {
          console.error('Failed to fetch gas balance:', error);
          setEmbeddedGasBalance(0);
        });
    }
  }, [hasEmbeddedWallet, embeddedWallet?.address]);

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const isLoading = walletsLoading || filesLoading || cryptoLoading || auditLoading;

  // Calculate total locked value (mock conversion)
  const totalLockedValue = locks.reduce((sum, lock) => {
    const rates: Record<string, number> = { MATIC: 0.5, USDC: 1, ETH: 2000, BTC: 40000 };
    const amount = parseFloat(lock.amountWei) / 1e18; // Convert from Wei
    return sum + (amount * (rates[lock.tokenSymbol] || 1));
  }, 0);

  const stats = [
    {
      title: 'Documents verrouillés',
      value: files.length.toString(),
      icon: FileText,
      color: 'text-cyan-neon',
    },
    {
      title: 'Fonds verrouillés',
      value: totalLockedValue.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'USD',
      icon: Bitcoin,
      color: 'text-success',
    },
    {
      title: 'Wallets connectés',
      value: wallets.length.toString(),
      icon: Wallet,
      color: 'text-warning',
    },
  ];

  // Convert audit logs to recent actions format
  const recentActions = logs.slice(0, 5).map((log) => ({
    id: log.id,
    type: log.entityType as 'file' | 'crypto' | 'wallet',
    description: `${log.action} - ${log.entityType}`,
    timestamp: new Date(log.createdAt),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 text-white mb-2">Dashboard</h1>
          <p className="text-text-secondary text-body">
            Vue d'ensemble de vos actifs verrouillés
          </p>
        </div>
        <Link href="/explication">
          <Button variant="outline" size="sm" className="gap-1.5 border-glass-border text-text-secondary hover:text-white whitespace-nowrap">
            <HelpCircle className="w-3.5 h-3.5" />
            Comment ça marche
          </Button>
        </Link>
      </div>

      {/* Wallet Card - Shows embedded wallet, external wallet, or connect prompt */}
      <Card className="glass-card border-cyan-neon/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-heading-3 text-white flex items-center gap-2">
            {hasEmbeddedWallet && !isConnected ? (
              <>
                <Shield className="w-5 h-5 text-purple-400" />
                Wallet Embarqué
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5 text-cyan-neon" />
                Wallet Web3
              </>
            )}
          </CardTitle>
          {(isConnected || hasEmbeddedWallet) && (
            <Badge className={hasEmbeddedWallet && !isConnected
              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : "bg-success/20 text-success border-success/30"
            }>
              {hasEmbeddedWallet && !isConnected ? 'Embarqué' : 'Connecté'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {/* External wallet connected */}
          {isConnected ? (
            <div className="space-y-4">
              {!chainInfo.supported && <WrongNetworkPrompt />}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-text-muted mb-1">Adresse</p>
                  <p className="font-mono text-white text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Réseau</p>
                  <div className="flex items-center gap-2">
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
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Solde</p>
                  <p className="text-white text-sm">
                    {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}
                  </p>
                </div>
              </div>
              {tokens.length > 0 && (
                <div className="mt-4 pt-4 border-t border-glass-border">
                  <p className="text-xs text-text-muted mb-2">Tokens ERC20</p>
                  <div className="space-y-2">
                    {tokens.slice(0, 3).map((token) => (
                      <div key={token.address} className="flex items-center justify-between text-sm">
                        <span className="text-white font-semibold">{token.symbol}</span>
                        <span className="text-text-secondary">{token.formatted}</span>
                      </div>
                    ))}
                    {tokens.length > 3 && (
                      <p className="text-xs text-text-muted">
                        +{tokens.length - 3} autre{tokens.length - 3 > 1 ? 's' : ''} token{tokens.length - 3 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-text-muted mt-4">
                Votre wallet externe est connecté. Vous pouvez verrouiller des cryptos.
              </p>
            </div>
          ) : hasEmbeddedWallet ? (
            /* Embedded wallet */
            <div className="space-y-4">
              {/* Full Address with Copy */}
              <div>
                <p className="text-xs text-text-muted mb-2">Adresse complète</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-blue border border-glass-border">
                  <p className="font-mono text-white text-xs break-all flex-1">
                    {embeddedWallet.address}
                  </p>
                  <button
                    onClick={() => copyAddress(embeddedWallet.address)}
                    className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-glass-surface/50 transition-colors flex-shrink-0"
                    title="Copier l'adresse"
                  >
                    {copiedAddress ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-text-muted mb-1">Réseau</p>
                  <p className="text-white text-sm font-semibold">Polygon (MATIC)</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Solde POL (gas fees)</p>
                  {embeddedGasBalance !== null ? (
                    <p className={`text-sm font-semibold ${embeddedGasBalance >= 1 ? 'text-success' : 'text-warning'}`}>
                      {embeddedGasBalance.toFixed(4)} POL
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">Chargement...</p>
                  )}
                </div>
              </div>

              {/* Gas Warning */}
              {embeddedGasBalance !== null && embeddedGasBalance < 1 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-warning font-medium">Solde POL insuffisant</p>
                      <p className="text-xs text-warning/80 mt-1">
                        Vous avez besoin d'au moins 1 POL pour payer les frais de transaction.
                        Envoyez des POL à votre adresse ci-dessus.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Info */}
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-300 font-medium">Wallet sécurisé</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Votre wallet est chiffré avec votre mot de passe.
                      Les transactions seront signées après vérification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href="/crypto" className="flex-1">
                  <Button className="w-full glass-button" disabled={embeddedGasBalance !== null && embeddedGasBalance < 20}>
                    <Bitcoin className="w-4 h-4 mr-2" />
                    {embeddedGasBalance !== null && embeddedGasBalance < 20 ? 'Solde insuffisant' : 'Verrouiller des cryptos'}
                  </Button>
                </Link>
                <Link href="/wallets">
                  <Button variant="outline" className="border-glass-border text-text-secondary hover:text-white">
                    Gérer
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* No wallet */
            <div className="text-center py-4">
              <p className="text-text-secondary mb-4">
                Connectez votre wallet pour accéder aux fonctionnalités crypto
              </p>
              <Button onClick={openConnectModal} className="glass-button">
                <Wallet className="w-4 h-4 mr-2" />
                Connecter un Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                </div>
                {stat.unit && (
                  <span className="text-text-muted text-sm">{stat.unit}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Actions */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-neon" />
            <CardTitle className="text-heading-3 text-white">
              Dernières actions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentActions.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              Aucune action récente
            </p>
          ) : (
            <div className="space-y-4">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-dark-blue-lighter/50 border border-glass-border/30 hover:border-glass-border transition-colors"
                >
                  <div className="flex-shrink-0">
                    {action.type === 'file' && (
                      <FileText className="w-5 h-5 text-cyan-neon" />
                    )}
                    {action.type === 'crypto' && (
                      <Bitcoin className="w-5 h-5 text-success" />
                    )}
                    {action.type === 'wallet' && (
                      <Wallet className="w-5 h-5 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-body-sm font-medium">
                      {action.description}
                    </p>
                    <p className="text-text-muted text-sm mt-1">
                      {formatDate(action.timestamp)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-cyan-neon/30 text-cyan-neon"
                  >
                    {action.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

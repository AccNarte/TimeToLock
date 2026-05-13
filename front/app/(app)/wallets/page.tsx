"use client";

import { useState } from 'react';
import { Plus, Wallet as WalletIcon, Loader2, Coins, Network, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallets } from '@/hooks/use-wallets';
import { useAccount, useBalance, useChainId } from '@/hooks/use-web3';
import { useTokenBalances, useMultiChainTokenBalances, useChainInfo } from '@/hooks/use-tokens';
import { formatWalletAddress, formatShortDate } from '@/lib/formatters';
import { MnemonicDisplayDialog } from '@/components/MnemonicDisplayDialog';
import { ExportMnemonicDialog } from '@/components/export-mnemonic-dialog';

export default function WalletsPage() {
  const { wallets, isLoading, error, createInternal, linkExternal, exportMnemonic } = useWallets();
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { data: nativeBalance } = useBalance({ address });
  
  // Networks to check - default: all supported networks
  const [selectedNetworks, setSelectedNetworks] = useState<number[]>([1, 137, 80002]);
  const { tokensByChain, isLoading: tokensLoading, totalTokens } = useMultiChainTokenBalances(selectedNetworks);
  const currentChainInfo = useChainInfo();
  
  const availableNetworks = [
    { id: 1, name: 'Ethereum', testnet: false },
    { id: 137, name: 'Polygon', testnet: false },
    { id: 80002, name: 'Polygon Amoy', testnet: true },
  ];
  
  const toggleNetwork = (chainId: number) => {
    setSelectedNetworks(prev => 
      prev.includes(chainId)
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Mnemonic dialog state
  const [isMnemonicDialogOpen, setIsMnemonicDialogOpen] = useState(false);
  const [newWalletMnemonic, setNewWalletMnemonic] = useState<string>('');
  const [newWalletAddress, setNewWalletAddress] = useState<string>('');

  // Export mnemonic dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportWalletId, setExportWalletId] = useState<string | null>(null);
  const [exportWalletAddress, setExportWalletAddress] = useState<string>('');

  const handleAddWallet = () => {
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleExportMnemonic = (walletId: string, walletAddress: string) => {
    setExportWalletId(walletId);
    setExportWalletAddress(walletAddress);
    setIsExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setIsExportDialogOpen(false);
    setExportWalletId(null);
    setExportWalletAddress('');
  };

  const handleConnectMetaMask = () => {
    alert('Connexion à MetaMask...');
    setIsModalOpen(false);
  };

  const handleCreateInternal = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await createInternal({ provider: 'ethers' });
      // Show mnemonic dialog
      setNewWalletMnemonic(response.mnemonic);
      setNewWalletAddress(response.wallet.address);
      setIsMnemonicDialogOpen(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la création du wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await linkExternal({ address: walletAddress });
      setIsModalOpen(false);
      setWalletAddress('');
    } catch (err) {
      setSubmitError('Erreur lors de l\'ajout du wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-white mb-2">Mes Wallets</h1>
          <p className="text-text-secondary text-body">
            Gérez vos portefeuilles crypto
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleAddWallet}
            className="glass-button gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un wallet externe
          </Button>
          <Button
            onClick={handleCreateInternal}
            className="glass-button gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Créer un wallet interne
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-error/20 border border-error/30 text-error">
          {error}
        </div>
      )}

      {/* Connected Wallet Info */}
      {isConnected && address && (
        <div className="space-y-6">
          {/* Current Network Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-heading-3 text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-neon" />
                Réseau connecté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-text-muted mb-1">Réseau actuel</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-lg font-semibold">{currentChainInfo.name}</p>
                    {currentChainInfo.testnet && (
                      <Badge className="bg-warning/20 text-warning border-warning/30">
                        Testnet
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Adresse du wallet</p>
                  <p className="text-white font-mono text-sm break-all">{address}</p>
                </div>
                {nativeBalance && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Solde natif</p>
                    <p className="text-white text-lg font-semibold">
                      {parseFloat(nativeBalance.formatted).toFixed(6)} {nativeBalance.symbol}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Multi-Chain Token Balances */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-heading-3 text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-cyan-neon" />
                  Tokens ERC20 (Multi-réseaux)
                </CardTitle>
                {totalTokens > 0 && (
                  <Badge className="bg-cyan-neon/20 text-cyan-neon border-cyan-neon/30">
                    {totalTokens} token{totalTokens > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {/* Network Selector */}
              <div className="flex flex-wrap gap-2">
                <p className="text-xs text-text-muted w-full mb-2">Sélectionner les réseaux à vérifier :</p>
                {availableNetworks.map((network) => (
                  <Button
                    key={network.id}
                    onClick={() => toggleNetwork(network.id)}
                    variant={selectedNetworks.includes(network.id) ? 'default' : 'outline'}
                    size="sm"
                    className={
                      selectedNetworks.includes(network.id)
                        ? 'bg-cyan-neon/20 text-cyan-neon border-cyan-neon/30'
                        : 'bg-glass-surface text-text-secondary border-glass-border hover:bg-glass-surface/50'
                    }
                  >
                    {network.name}
                    {network.testnet && (
                      <Badge className="ml-2 bg-warning/20 text-warning border-warning/30 text-xs">
                        Test
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-cyan-neon animate-spin" />
                </div>
              ) : Object.keys(tokensByChain).length === 0 ? (
                <p className="text-text-muted text-center py-8">
                  Aucun token ERC20 détecté sur les réseaux sélectionnés
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(tokensByChain).map(([chainIdStr, tokens]) => {
                    const chainId = parseInt(chainIdStr);
                    // Get chain info based on chainId
                    const getChainInfo = (id: number) => {
                      switch (id) {
                        case 1: return { name: 'Ethereum', testnet: false };
                        case 137: return { name: 'Polygon', testnet: false };
                        case 80002: return { name: 'Polygon Amoy', testnet: true };
                        default: return { name: 'Unknown Network', testnet: false };
                      }
                    };
                    const chainInfo = getChainInfo(chainId);
                    
                    return (
                      <div key={chainId} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-glass-border">
                          <Network className="w-4 h-4 text-cyan-neon" />
                          <p className="text-white font-semibold">{chainInfo.name}</p>
                          {chainInfo.testnet && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                              Testnet
                            </Badge>
                          )}
                          <Badge className="bg-glass-surface text-text-secondary text-xs font-mono">
                            Chain ID: {chainId}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4">
                          {tokens.map((token) => (
                            <div
                              key={`${chainId}-${token.address}`}
                              className="flex items-center justify-between p-3 rounded-lg bg-glass-surface/30 border border-glass-border"
                            >
                              <div>
                                <p className="text-white font-semibold">{token.symbol}</p>
                                <p className="text-xs text-text-muted">{token.name}</p>
                                <p className="text-xs text-text-muted font-mono mt-1">
                                  {token.address.slice(0, 8)}...{token.address.slice(-6)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-semibold text-lg">{token.formatted}</p>
                                <p className="text-xs text-text-muted">{token.symbol}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-heading-3 text-white flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-cyan-neon" />
            Liste des wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              Aucun wallet connecté. Ajoutez votre premier wallet!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border hover:bg-transparent">
                  <TableHead className="text-text-secondary">Type</TableHead>
                  <TableHead className="text-text-secondary">Adresse</TableHead>
                  <TableHead className="text-text-secondary">Date de création</TableHead>
                  <TableHead className="text-text-secondary">Statut</TableHead>
                  <TableHead className="text-text-secondary text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow
                    key={wallet.id}
                    className="border-glass-border hover:bg-glass-surface/30"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            wallet.type === 'external'
                              ? 'border-cyan-neon/30 text-cyan-neon'
                              : 'border-purple-500/30 text-purple-400'
                          }
                        >
                          {wallet.type === 'external' ? 'Externe' : 'Embarqué'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-white">
                      {formatWalletAddress(wallet.address)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {formatShortDate(new Date(wallet.createdAt))}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-success/20 text-success border-success/30">
                        Actif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {wallet.type === 'internal' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportMnemonic(wallet.id, wallet.address)}
                          className="h-8 px-2 text-text-muted hover:text-cyan-neon"
                          title="Exporter la phrase de récupération"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Wallet Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-heading-3 text-white">
              Ajouter un wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <Button
              onClick={handleConnectMetaMask}
              className="w-full glass-button h-12"
            >
              <WalletIcon className="w-5 h-5 mr-2" />
              Connecter MetaMask
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-glass-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-glass-surface px-2 text-text-muted">
                  Ou
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-text-secondary">
                  Adresse du wallet
                </Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-dark-blue-lighter border-glass-border text-white placeholder:text-text-muted font-mono"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full glass-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter'
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mnemonic Display Dialog */}
      <MnemonicDisplayDialog
        open={isMnemonicDialogOpen}
        onOpenChange={setIsMnemonicDialogOpen}
        mnemonic={newWalletMnemonic}
        walletAddress={newWalletAddress}
      />

      {/* Export Mnemonic Dialog */}
      {exportWalletId && (
        <ExportMnemonicDialog
          isOpen={isExportDialogOpen}
          onClose={handleExportClose}
          walletAddress={exportWalletAddress}
          onExport={(password) => exportMnemonic(parseInt(exportWalletId), password)}
        />
      )}
    </div>
  );
}

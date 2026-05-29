"use client";

import { useState, useMemo, useEffect } from 'react';
import { Bitcoin, Calendar as CalendarIcon, Lock, Unlock, Loader2, Shield, Key } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCryptoLocks } from '@/hooks/use-crypto-locks-query';
import { useWallets } from '@/hooks/use-wallets-query';
import { useMultiChainTokenBalances, useEtherscanTokenBalances } from '@/hooks/use-tokens';
import { useAccount, useBalance, useSwitchChain } from '@/hooks/use-web3';
import { useTimelockContract, useTokenAllowance } from '@/hooks/use-timelock-contract';
import { useEmbeddedTimelock } from '@/hooks/use-embedded-timelock';
import { useEmbeddedWallet } from '@/contexts/embedded-wallet-context';
import { cryptoLocksService } from '@/lib/api/crypto-locks';
import { formatAmount, formatShortDate, formatWalletAddress } from '@/lib/formatters';
import { CryptoLock, CryptoLockStatus } from '@/lib/api/types';
import { Address, parseUnits } from 'viem';
import { toast } from 'sonner';
import { getNativeBalance } from '@/lib/etherscan';
import { CryptoRescueKitModal } from '@/components/CryptoRescueKitModal';
import type { CryptoRescueKitData } from '@/lib/pdf/crypto-rescue-kit';

// Supported networks for TimeLock
// Only Polygon is enabled for the beta (Ethereum gas fees too high).
// Mark other networks `comingSoon: true` to keep them visible but disabled.
const SUPPORTED_NETWORKS: Array<{ id: number; name: string; symbol: string; comingSoon?: boolean }> = [
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 1, name: 'Ethereum', symbol: 'ETH', comingSoon: true },
];

// Chain IDs to check for token balances (only active networks)
const CHAIN_IDS_TO_CHECK = SUPPORTED_NETWORKS.filter(n => !n.comingSoon).map(n => n.id);

// Token addresses by chain.
// Native MATIC uses the sentinel address(0) below; the contract uses the
// `createLockNative` payable function to lock it via msg.value. ERC20 tokens
// go through the standard approve + createLock flow.
const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000' as Address;

const TOKEN_ADDRESSES_BY_CHAIN: Record<number, Record<string, { address: Address; decimals: number; tokenContractId: number; isNative?: boolean }>> = {
  137: { // Polygon
    'MATIC': { address: NATIVE_SENTINEL, decimals: 18, tokenContractId: 1, isNative: true },
    'WMATIC': { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address, decimals: 18, tokenContractId: 5 },
    'USDC': { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address, decimals: 6, tokenContractId: 2 },
    'USDT': { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address, decimals: 6, tokenContractId: 3 },
    'DAI': { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address, decimals: 18, tokenContractId: 4 },
  },
  1: { // Ethereum
    'USDC': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, decimals: 6, tokenContractId: 11 },
    'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, decimals: 6, tokenContractId: 12 },
    'DAI': { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address, decimals: 18, tokenContractId: 13 },
  },
};

// Legacy single chain reference (for backward compatibility)
const TOKEN_ADDRESSES = TOKEN_ADDRESSES_BY_CHAIN[137];

// Minimum native POL recommended in an embedded wallet to cover gas fees.
const MIN_GAS_POL = 1;

export default function CryptoPage() {
  const { locks, isLoading: locksLoading, error: locksError, refetch: refetchLocks } = useCryptoLocks();
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { address: externalAddress, isConnected: isExternalConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Embedded wallet support
  const { isUnlocked: isEmbeddedUnlocked, unlockedAddress, requestUnlock } = useEmbeddedWallet();
  const embeddedWallet = wallets.find((w) => w.type === 'internal');
  const hasEmbeddedWallet = !!embeddedWallet;

  // Unified wallet state: prefer external, fallback to embedded
  const isConnected = isExternalConnected || hasEmbeddedWallet;
  const address = isExternalConnected ? externalAddress : embeddedWallet?.address;
  const isUsingEmbedded = !isExternalConnected && hasEmbeddedWallet;

  // Token balances - use wagmi for external wallet, Etherscan for embedded
  const { tokensByChain: wagmiTokensByChain, allTokens: wagmiAllTokens, isLoading: wagmiTokensLoading } = useMultiChainTokenBalances(CHAIN_IDS_TO_CHECK);
  const { tokensByChain: etherscanTokensByChain, tokens: etherscanTokens, isLoading: etherscanTokensLoading } = useEtherscanTokenBalances(isUsingEmbedded ? embeddedWallet?.address : null);

  // Use appropriate token source based on wallet type
  const tokensByChain = isUsingEmbedded ? etherscanTokensByChain : wagmiTokensByChain;
  const allTokens = isUsingEmbedded ? etherscanTokens : wagmiAllTokens;
  const tokensLoading = isUsingEmbedded ? etherscanTokensLoading : wagmiTokensLoading;

  // Timelock contract hooks (wagmi - for external wallets)
  const {
    approveToken: approveTokenExternal,
    isApproving: isApprovingExternal,
    isApproveSuccess,
    approveError,
    createLock: createLockExternal,
    isCreating: isCreatingExternal,
    isCreateSuccess,
    createReceipt,
    createError,
    parseLockAddress,
    withdraw: withdrawExternal,
    isWithdrawing: isWithdrawingExternal,
    isWithdrawSuccess,
    withdrawHash,
    step: stepExternal,
    factoryAddress,
    chainId: POLYGON_CHAIN_ID,
  } = useTimelockContract();

  // Embedded timelock hooks (ethers.js - for embedded wallets)
  const {
    approveToken: approveTokenEmbedded,
    createLock: createLockEmbedded,
    withdraw: withdrawEmbedded,
    isApproving: isApprovingEmbedded,
    isCreating: isCreatingEmbedded,
    isWithdrawing: isWithdrawingEmbedded,
    step: stepEmbedded,
    error: embeddedError,
    checkAllowance,
  } = useEmbeddedTimelock();

  // Unified state based on wallet type
  const isApproving = isUsingEmbedded ? isApprovingEmbedded : isApprovingExternal;
  const isCreating = isUsingEmbedded ? isCreatingEmbedded : isCreatingExternal;
  const isWithdrawing = isUsingEmbedded ? isWithdrawingEmbedded : isWithdrawingExternal;
  const step = isUsingEmbedded ? stepEmbedded : stepExternal;

  // Log errors for debugging
  useEffect(() => {
    if (approveError) {
      console.error('Approve error:', approveError);
      setSubmitError(`Erreur d'approbation: ${approveError.message}`);
      setIsSubmitting(false);
    }
  }, [approveError]);

  useEffect(() => {
    if (createError) {
      console.error('Create error:', createError);
      setSubmitError(`Erreur de création: ${createError.message}`);
      setIsSubmitting(false);
    }
  }, [createError]);

  const [selectedNetwork, setSelectedNetwork] = useState<number>(137); // Default to Polygon
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [withdrawingLockId, setWithdrawingLockId] = useState<string | null>(null);
  const [embeddedGasBalance, setEmbeddedGasBalance] = useState<number | null>(null);
  const [rescueKit, setRescueKit] = useState<CryptoRescueKitData | null>(null);

  // Fetch gas balance for embedded wallet via Etherscan API
  useEffect(() => {
    if (isUsingEmbedded && embeddedWallet) {
      getNativeBalance(embeddedWallet.address)
        .then(setEmbeddedGasBalance)
        .catch((error) => {
          console.error('Failed to fetch gas balance:', error);
          setEmbeddedGasBalance(0);
        });
    }
  }, [isUsingEmbedded, embeddedWallet?.address]);

  const hasEnoughGas = embeddedGasBalance === null || embeddedGasBalance >= MIN_GAS_POL;

  const isLoading = locksLoading || walletsLoading;

  // Native chain balance for the connected external wallet (MATIC on Polygon).
  // Embedded wallets reuse the already-fetched `embeddedGasBalance`.
  const { data: externalNativeBalance } = useBalance({
    address: isExternalConnected ? (externalAddress as Address | undefined) : undefined,
    chainId: 137,
    query: { enabled: isExternalConnected && selectedNetwork === 137 },
  });

  const polygonNativeBalance = useMemo(() => {
    if (isUsingEmbedded) return embeddedGasBalance ?? 0;
    if (externalNativeBalance) return parseFloat(externalNativeBalance.formatted);
    return 0;
  }, [isUsingEmbedded, embeddedGasBalance, externalNativeBalance]);

  // Get tokens for selected network from RPC balances
  const availableTokensForNetwork = useMemo(() => {
    const networkTokens = tokensByChain[selectedNetwork] || [];
    const supportedTokens = Object.entries(TOKEN_ADDRESSES_BY_CHAIN[selectedNetwork] || {});

    return supportedTokens.map(([symbol, info]) => {
      // Native MATIC: balance comes from eth_getBalance, not from an ERC20 contract.
      if (info.isNative && selectedNetwork === 137) {
        return {
          symbol,
          balance: polygonNativeBalance,
          hasBalance: polygonNativeBalance > 0,
        };
      }
      const rpcToken = networkTokens.find(t => t.symbol === symbol);
      return {
        symbol,
        balance: rpcToken ? parseFloat(rpcToken.formatted) : 0,
        hasBalance: !!rpcToken && parseFloat(rpcToken.formatted) > 0,
      };
    });
  }, [tokensByChain, selectedNetwork, polygonNativeBalance]);

  // Get token info for selected network and token
  const selectedTokenInfo = useMemo(() => {
    if (!selectedToken || !selectedNetwork) return null;
    const networkTokens = TOKEN_ADDRESSES_BY_CHAIN[selectedNetwork];
    return networkTokens?.[selectedToken] || null;
  }, [selectedToken, selectedNetwork]);

  // Check allowance (only for external wallets via wagmi)
  const { allowance, refetchAllowance } = useTokenAllowance(
    selectedTokenInfo?.address || null,
    (isExternalConnected ? externalAddress : undefined) as Address | undefined
  );

  // Get available balance for selected token on selected network
  const availableBalance = useMemo(() => {
    if (!selectedToken || !selectedNetwork) return null;

    const tokenInfo = TOKEN_ADDRESSES_BY_CHAIN[selectedNetwork]?.[selectedToken];
    if (tokenInfo?.isNative && selectedNetwork === 137) {
      return polygonNativeBalance;
    }

    const networkTokens = tokensByChain[selectedNetwork] || [];
    const tokenBalance = networkTokens.find(token => token.symbol === selectedToken);
    return tokenBalance ? parseFloat(tokenBalance.formatted) : 0;
  }, [selectedToken, selectedNetwork, tokensByChain, polygonNativeBalance]);

  // Reset token when network changes
  useEffect(() => {
    setSelectedToken('');
    setAmount('');
  }, [selectedNetwork]);

  // Handle Max button click
  const handleMaxClick = () => {
    if (availableBalance !== null) {
      setAmount(availableBalance.toString());
    }
  };

  // Handle approval success - proceed to create lock
  useEffect(() => {
    if (isApproveSuccess && isSubmitting) {
      handleCreateLock();
    }
  }, [isApproveSuccess]);

  // Handle create lock success - save to DB
  useEffect(() => {
    if (isCreateSuccess && createReceipt && isSubmitting) {
      handleSaveLockToDb();
    }
  }, [isCreateSuccess, createReceipt]);

  const handleCreateLock = async () => {
    if (!selectedTokenInfo || !unlockDate) return;

    try {
      const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);

      await createLockExternal({
        tokenAddress: selectedTokenInfo.address,
        amount,
        decimals: selectedTokenInfo.decimals,
        unlockTimestamp,
        isNative: selectedTokenInfo.isNative,
      });
    } catch (error: any) {
      console.error('Create lock error:', error);
      setSubmitError(error.message || 'Erreur lors de la création du lock');
      setIsSubmitting(false);
    }
  };

  const handleSaveLockToDb = async () => {
    if (!createReceipt || !selectedTokenInfo || !address) return;

    try {
      // Parse lock address from receipt
      const lockContractAddress = parseLockAddress(createReceipt);
      if (!lockContractAddress) {
        throw new Error('Failed to parse lock address from transaction');
      }

      // Find wallet ID by connected address
      const connectedWallet = wallets.find(
        w => w.address.toLowerCase() === address.toLowerCase()
      );

      // Calculate amount in wei
      const amountWei = parseUnits(amount, selectedTokenInfo.decimals).toString();

      // Save to database (if wallet is registered, otherwise just show success)
      let savedLockId: string | number = createReceipt.transactionHash.slice(0, 10);
      if (connectedWallet) {
        const saved: any = await cryptoLocksService.saveLockFromFrontend({
          walletId: parseInt(connectedWallet.id),
          tokenContractId: selectedTokenInfo.tokenContractId,
          amountWei,
          unlockAt: new Date(unlockDate).toISOString(),
          txHash: createReceipt.transactionHash,
          lockContractAddress,
          chainId: selectedNetwork,
        });
        if (saved?.id) savedLockId = saved.id;
      } else {
        console.warn('Wallet not registered in backend, lock saved on chain only');
      }

      toast.success('Lock créé avec succès !');

      // Offer the user a printable rescue PDF — one-time chance, right after creation.
      setRescueKit({
        lockDbId: savedLockId,
        vaultAddress: lockContractAddress,
        ownerAddress: address,
        chainId: selectedNetwork,
        chainName: 'Polygon Mainnet',
        createTxHash: createReceipt.transactionHash,
        tokenSymbol: selectedToken,
        tokenName: selectedToken,
        isNative: !!selectedTokenInfo.isNative,
        tokenContractAddress: selectedTokenInfo.isNative ? undefined : selectedTokenInfo.address,
        tokenDecimals: selectedTokenInfo.decimals,
        amountFormatted: amount,
        amountWei,
        createdAt: new Date(),
        unlockAt: new Date(unlockDate),
      });

      // Reset form
      setSelectedToken('');
      setAmount('');
      setUnlockDate('');
      setIsSubmitting(false);
      refetchLocks();
    } catch (error: any) {
      console.error('Save to DB error:', error);
      setSubmitError('Lock créé mais erreur lors de la sauvegarde en DB');
      setIsSubmitting(false);
    }
  };

  const handleLockFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken || !amount || !unlockDate || !address) return;

    // For external wallets, check network
    if (!isUsingEmbedded && chainId !== selectedNetwork) {
      try {
        await switchChain({ chainId: selectedNetwork });
      } catch (error) {
        const networkName = SUPPORTED_NETWORKS.find(n => n.id === selectedNetwork)?.name || 'réseau sélectionné';
        setSubmitError(`Veuillez basculer sur ${networkName}`);
        return;
      }
    }

    // Check if factory is configured (only for Polygon for now)
    if (selectedNetwork === 137 && !factoryAddress) {
      setSubmitError('Factory non configurée. Veuillez déployer les contrats d\'abord.');
      return;
    }

    const tokenInfo = selectedTokenInfo;
    if (!tokenInfo) {
      setSubmitError('Token non supporté sur ce réseau');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isUsingEmbedded) {
        // ===== EMBEDDED WALLET FLOW =====
        const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);

        // Native MATIC skips the approve step (no ERC20 allowance involved).
        let needsApproval = false;
        if (!tokenInfo.isNative) {
          const currentAllowance = await checkAllowance(tokenInfo.address, address);
          const amountWei = BigInt(parseUnits(amount, tokenInfo.decimals).toString());
          needsApproval = currentAllowance < amountWei;

          if (needsApproval) {
            toast.info('Étape 1/2 : Approbation des tokens...');
            await approveTokenEmbedded(tokenInfo.address, amount, tokenInfo.decimals);
          }
        }

        toast.info(needsApproval ? 'Étape 2/2 : Création du lock...' : 'Création du lock...');

        const result = await createLockEmbedded({
          tokenAddress: tokenInfo.address,
          amount,
          decimals: tokenInfo.decimals,
          unlockTimestamp,
          isNative: tokenInfo.isNative,
        });

        // Save to DB
        const connectedWallet = wallets.find(
          w => w.address.toLowerCase() === address.toLowerCase()
        );

        const amountWeiEmbedded = parseUnits(amount, tokenInfo.decimals).toString();
        let savedLockIdEmbedded: string | number = result.txHash.slice(0, 10);
        if (connectedWallet) {
          const saved: any = await cryptoLocksService.saveLockFromFrontend({
            walletId: parseInt(connectedWallet.id),
            tokenContractId: tokenInfo.tokenContractId,
            amountWei: amountWeiEmbedded,
            unlockAt: new Date(unlockDate).toISOString(),
            txHash: result.txHash,
            lockContractAddress: result.lockAddress,
            chainId: selectedNetwork,
          });
          if (saved?.id) savedLockIdEmbedded = saved.id;
        }

        toast.success('Lock créé avec succès !');

        setRescueKit({
          lockDbId: savedLockIdEmbedded,
          vaultAddress: result.lockAddress,
          ownerAddress: address,
          chainId: selectedNetwork,
          chainName: 'Polygon Mainnet',
          createTxHash: result.txHash,
          tokenSymbol: selectedToken,
          tokenName: selectedToken,
          isNative: !!tokenInfo.isNative,
          tokenContractAddress: tokenInfo.isNative ? undefined : tokenInfo.address,
          tokenDecimals: tokenInfo.decimals,
          amountFormatted: amount,
          amountWei: amountWeiEmbedded,
          createdAt: new Date(),
          unlockAt: new Date(unlockDate),
        });

        setSelectedToken('');
        setAmount('');
        setUnlockDate('');
        setIsSubmitting(false);
        refetchLocks();

      } else {
        // ===== EXTERNAL WALLET FLOW =====
        // Native MATIC: no approve, go straight to createLockNative.
        if (tokenInfo.isNative) {
          toast.info('Création du lock...');
          await handleCreateLock();
          return;
        }

        const amountWei = parseUnits(amount, tokenInfo.decimals);
        const needsApproval = !allowance || allowance < amountWei;

        if (needsApproval) {
          toast.info('Étape 1/2 : Approbation des tokens...');
          await approveTokenExternal(tokenInfo.address, amount, tokenInfo.decimals);
          // After approval success, useEffect will trigger handleCreateLock
        } else {
          toast.info('Étape 1/1 : Création du lock...');
          await handleCreateLock();
        }
      }
    } catch (err: any) {
      console.error('Lock funds error:', err);
      setSubmitError(err.message || 'Erreur lors du verrouillage des fonds');
      setIsSubmitting(false);
    }
  };

  // Handle withdraw success - update DB
  useEffect(() => {
    if (isWithdrawSuccess && withdrawHash && withdrawingLockId) {
      handleWithdrawSuccess();
    }
  }, [isWithdrawSuccess, withdrawHash]);

  const handleWithdrawSuccess = async () => {
    if (!withdrawHash || !withdrawingLockId) return;

    try {
      // Mark as withdrawn in DB
      await cryptoLocksService.markAsWithdrawn(parseInt(withdrawingLockId), {
        txHash: withdrawHash,
        chainId: POLYGON_CHAIN_ID,
      });

      toast.success('Fonds retirés avec succès !');

      // Refresh locks list
      refetchLocks();
    } catch (error: any) {
      console.error('Error updating withdrawal in DB:', error);
      toast.error('Fonds retirés mais erreur lors de la mise à jour');
    } finally {
      setWithdrawingLockId(null);
    }
  };

  const handleWithdraw = async (lock: CryptoLock) => {
    if (!lock.lockContractAddress || !address) {
      toast.error('Adresse du contrat ou wallet non disponible');
      return;
    }

    // For external wallets, check network
    if (!isUsingEmbedded && chainId !== POLYGON_CHAIN_ID) {
      try {
        await switchChain({ chainId: POLYGON_CHAIN_ID });
      } catch (error) {
        toast.error('Veuillez basculer sur le réseau Polygon');
        return;
      }
    }

    try {
      setWithdrawingLockId(lock.id);
      toast.info('Retrait en cours...');

      if (isUsingEmbedded) {
        // Embedded wallet withdrawal
        const txHash = await withdrawEmbedded(lock.lockContractAddress);

        // Update DB
        await cryptoLocksService.markAsWithdrawn(parseInt(lock.id), {
          txHash,
          chainId: POLYGON_CHAIN_ID,
        });

        toast.success('Fonds retirés avec succès !');
        refetchLocks();
        setWithdrawingLockId(null);
      } else {
        // External wallet withdrawal (useEffect will handle success)
        await withdrawExternal(lock.lockContractAddress as Address);
      }
    } catch (error: any) {
      console.error('Withdraw error:', error);
      toast.error(error.message || 'Erreur lors du retrait');
      setWithdrawingLockId(null);
    }
  };

  const getStatusBadge = (status: CryptoLockStatus) => {
    const variants: Record<CryptoLockStatus, string> = {
      locked: 'bg-error/20 text-error border-error/30',
      unlockable: 'bg-warning/20 text-warning border-warning/30',
      withdrawn: 'bg-success/20 text-success border-success/30',
    };
    const labels: Record<CryptoLockStatus, string> = {
      locked: 'Verrouillé',
      unlockable: 'Déverrouillable',
      withdrawn: 'Retiré',
    };
    return { className: variants[status], label: labels[status] };
  };

  // Calculate stats
  const activeLocks = locks.filter(lock => lock.status === 'locked' || lock.status === 'unlockable').length;
  const totalValue = locks.reduce((sum, lock) => {
    const rates: Record<string, number> = { MATIC: 0.5, USDC: 1, ETH: 2000, BTC: 40000 };
    const amount = parseFloat(lock.amountWei) / 1e18;
    return sum + (amount * (rates[lock.tokenSymbol] || 1));
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-1 text-white mb-2">TimeLock Crypto</h1>
        <p className="text-text-secondary text-body">
          Verrouillez vos cryptomonnaies avec des smart contracts
        </p>
      </div>

      {locksError && (
        <div className="p-4 rounded-lg bg-error/20 border border-error/30 text-error">
          {locksError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Verrous actifs
            </CardTitle>
            <Lock className="w-5 h-5 text-cyan-neon" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeLocks}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Fonds verrouillés
            </CardTitle>
            <Bitcoin className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-white">
                {formatAmount(totalValue)}
              </div>
              <span className="text-text-muted text-sm">USD</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lock Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-heading-3 text-white">
            Verrouiller des fonds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
              {submitError}
            </div>
          )}
          
          {!isConnected ? (
            <p className="text-text-muted text-center py-4">
              Connectez votre wallet Web3 pour verrouiller des fonds.
            </p>
          ) : (
            <form onSubmit={handleLockFunds} className="space-y-6">
              {/* Connected Wallet Info */}
              <div className={`p-3 rounded-lg border ${isUsingEmbedded ? 'bg-purple-500/10 border-purple-500/30' : 'bg-glass-surface/50 border-glass-border'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isUsingEmbedded ? (
                        <Shield className="w-4 h-4 text-purple-400" />
                      ) : null}
                      <p className="text-xs text-text-muted">
                        {isUsingEmbedded ? 'Wallet embarqué' : 'Wallet connecté'}
                      </p>
                    </div>
                    <p className="text-white font-mono">{formatWalletAddress(address!)}</p>
                  </div>
                  {isUsingEmbedded && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      Embarqué
                    </Badge>
                  )}
                </div>
                {isUsingEmbedded && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-purple-300">
                      La signature nécessitera votre mot de passe
                    </p>
                  </div>
                )}
              </div>

              {/* Gas Balance Warning for Embedded Wallet */}
              {isUsingEmbedded && embeddedGasBalance !== null && (
                <div className={`p-3 rounded-lg border ${embeddedGasBalance >= MIN_GAS_POL
                  ? 'bg-success/10 border-success/30'
                  : 'bg-warning/10 border-warning/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={embeddedGasBalance >= MIN_GAS_POL ? 'text-success' : 'text-warning'}>
                        {embeddedGasBalance >= MIN_GAS_POL ? '✓' : '⚠️'}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${embeddedGasBalance >= MIN_GAS_POL ? 'text-success' : 'text-warning'}`}>
                          Solde POL pour les gas fees
                        </p>
                        <p className={`text-xs ${embeddedGasBalance >= MIN_GAS_POL ? 'text-success/80' : 'text-warning/80'}`}>
                          {embeddedGasBalance >= MIN_GAS_POL
                            ? 'Solde suffisant pour les transactions'
                            : `Solde insuffisant - minimum recommandé : ${MIN_GAS_POL} POL`}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${embeddedGasBalance >= MIN_GAS_POL ? 'text-success' : 'text-warning'}`}>
                      {embeddedGasBalance.toFixed(4)} POL
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="network" className="text-text-secondary">
                    Choisir un réseau
                  </Label>
                  <Select value={selectedNetwork.toString()} onValueChange={(v) => setSelectedNetwork(parseInt(v))}>
                    <SelectTrigger className="bg-dark-blue-lighter border-glass-border text-white">
                      <SelectValue placeholder="Sélectionner un réseau" />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-surface border-glass-border">
                      {SUPPORTED_NETWORKS.map((network) => (
                        <SelectItem
                          key={network.id}
                          value={network.id.toString()}
                          disabled={network.comingSoon}
                        >
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{network.name} ({network.symbol})</span>
                            {network.comingSoon && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">
                                Bientôt
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token" className="text-text-secondary">
                    Choisir un token
                  </Label>
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="bg-dark-blue-lighter border-glass-border text-white">
                      <SelectValue placeholder="Sélectionner un token" />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-surface border-glass-border">
                      {availableTokensForNetwork.map(({ symbol, balance, hasBalance }) => (
                        <SelectItem key={symbol} value={symbol}>
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{symbol}</span>
                            <span className={hasBalance ? 'text-cyan-neon' : 'text-text-muted'}>
                              {formatAmount(balance, 4)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-text-secondary">
                    Montant
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-dark-blue-lighter border-glass-border text-white placeholder:text-text-muted pr-16"
                    />
                    {selectedToken && availableBalance !== null && (
                      <Button
                        type="button"
                        onClick={handleMaxClick}
                        disabled={isSubmitting || availableBalance === 0}
                        className="absolute right-1 top-1 h-8 px-3 text-xs bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon border border-cyan-neon/30"
                      >
                        Max
                      </Button>
                    )}
                  </div>
                  {selectedToken && (
                    <p className="text-xs text-text-muted mt-1">
                      {availableBalance !== null ? (
                        <>
                          Disponible : <span className="text-cyan-neon font-semibold">{formatAmount(availableBalance, 6)} {selectedToken}</span>
                        </>
                      ) : (
                        tokensLoading ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Chargement du solde...
                          </span>
                        ) : !isConnected ? (
                          <span className="text-warning">Connectez votre wallet pour voir le solde</span>
                        ) : (
                          <span className="text-text-muted">Solde : 0 {selectedToken}</span>
                        )
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlockDate" className="text-text-secondary">
                    Date de déverrouillage
                  </Label>
                  <Input
                    id="unlockDate"
                    type="datetime-local"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    disabled={isSubmitting}
                    min={new Date().toISOString().slice(0, 16)}
                    className="bg-dark-blue-lighter border-glass-border text-white"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="glass-button w-full md:w-auto"
                disabled={isSubmitting || !isConnected || !selectedToken || !amount || !unlockDate || (isUsingEmbedded && !hasEnoughGas)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verrouillage en cours...
                  </>
                ) : (isUsingEmbedded && !hasEnoughGas) ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Solde POL insuffisant
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Verrouiller les fonds
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Locks Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-heading-3 text-white flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-cyan-neon" />
            Verrous actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locks.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              Aucun verrou crypto. Verrouillez vos premiers fonds!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border hover:bg-transparent">
                  <TableHead className="text-text-secondary">Token</TableHead>
                  <TableHead className="text-text-secondary">Montant</TableHead>
                  <TableHead className="text-text-secondary">Date de déverrouillage</TableHead>
                  <TableHead className="text-text-secondary">Statut</TableHead>
                  <TableHead className="text-text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => {
                  const amountDisplay = lock.amountFormatted
                    ? parseFloat(lock.amountFormatted)
                    : parseFloat(lock.amountWei) / Math.pow(10, lock.tokenDecimals || 18);
                  const statusBadge = getStatusBadge(lock.status);
                  const canWithdraw = lock.status === 'unlockable';
                  const unlockDate = new Date(lock.unlockAt);
                  const now = new Date();
                  const timeRemaining = unlockDate.getTime() - now.getTime();
                  const isUnlocked = timeRemaining <= 0;

                  return (
                    <TableRow
                      key={lock.id}
                      className="border-glass-border hover:bg-glass-surface/30"
                    >
                      <TableCell className="font-medium text-white">
                        <Badge variant="outline" className="border-cyan-neon/30 text-cyan-neon">
                          {lock.tokenSymbol || 'TOKEN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-mono">
                        {formatAmount(amountDisplay, 6)} {lock.tokenSymbol}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {formatShortDate(unlockDate)}
                          </div>
                          {!isUnlocked && lock.status === 'locked' && (
                            <span className="text-xs text-warning mt-1">
                              {Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))} jours restants
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canWithdraw && (
                          <Button
                            size="sm"
                            onClick={() => handleWithdraw(lock)}
                            disabled={withdrawingLockId === lock.id || isWithdrawing}
                            className="glass-button h-8"
                          >
                            {withdrawingLockId === lock.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Retrait...
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 mr-1" />
                                Retirer
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CryptoRescueKitModal
        open={!!rescueKit}
        data={rescueKit}
        onClose={() => setRescueKit(null)}
      />
    </div>
  );
}

'use client';

import { useAccount, useChainId, useReadContracts, useReadContract } from 'wagmi';
import { erc20Abi, createPublicClient, http } from 'viem';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { useMemo, useState, useEffect } from 'react';
import { getNativeBalance, getPolygonTokenBalances, FormattedTokenBalance } from '@/lib/etherscan';

// Common ERC20 tokens by chain
const COMMON_TOKENS: Record<number, Array<{ address: `0x${string}`; symbol: string; decimals: number; name: string }>> = {
  1: [ // Ethereum Mainnet
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  ],
  137: [ // Polygon Mainnet
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6, name: 'USD Coin (Native)' },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC.e', decimals: 6, name: 'USD Coin (PoS - Bridged)' },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18, name: 'Wrapped MATIC' },
  ],
  80002: [ // Polygon Amoy Testnet
    // Note: Polygon Amoy testnet may not have standard ERC20 tokens deployed
    // Add valid testnet token addresses here if available
  ],
};

// Chain configs for public clients
const CHAIN_CONFIGS: Record<number, any> = {
  1: mainnet,
  137: polygon,
  80002: polygonAmoy,
};

// Reliable public RPC endpoints
const RPC_URLS: Record<number, string> = {
  1: 'https://ethereum-rpc.publicnode.com',
  137: 'https://polygon-bor-rpc.publicnode.com',
  80002: 'https://rpc-amoy.polygon.technology',
};

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formatted: string;
  isLoading: boolean;
}

export function useTokenBalances() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const tokens = COMMON_TOKENS[chainId] || [];

  // Create contracts array for batch reading
  const contracts = useMemo(() => {
    if (!isConnected || !address) return [];
    
    return tokens.flatMap((token) => [
      {
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [address as `0x${string}`],
      },
      {
        address: token.address,
        abi: erc20Abi,
        functionName: 'decimals' as const,
      },
    ]);
  }, [tokens, address, isConnected]);

  const { data: results, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: isConnected && !!address && contracts.length > 0,
    },
  });

  const tokenBalances: TokenBalance[] = useMemo(() => {
    if (!results || results.length === 0) return [];

    const balances: TokenBalance[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const balanceResult = results[i * 2];
      const decimalsResult = results[i * 2 + 1];
      
      const balance = balanceResult?.result?.toString() || '0';
      const decimals = (decimalsResult?.result as number) || token.decimals;
      
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const zeroBigInt = BigInt(0);
      const formatted = balanceBigInt > zeroBigInt
        ? (Number(balanceBigInt) / Number(divisor)).toFixed(6)
        : '0';

      // Only include tokens with balance > 0
      if (balanceBigInt > zeroBigInt) {
        balances.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals,
          balance,
          formatted,
          isLoading: !balanceResult || !decimalsResult,
        });
      }
    }

    return balances;
  }, [results, tokens]);

  return {
    tokens: tokenBalances,
    isLoading,
    chainId,
  };
}

// Beta: only Polygon mainnet is fully supported. Other chains are flagged
// `supported: false` so the UI can prompt the user to switch.
export const SUPPORTED_CHAIN_ID = 137;

export function useChainInfo(chainId?: number) {
  const currentChainId = useChainId();
  const targetChainId = chainId || currentChainId;

  const chainInfo = useMemo(() => {
    switch (targetChainId) {
      case 1:
        return {
          id: 1,
          name: 'Ethereum',
          symbol: 'ETH',
          explorer: 'https://etherscan.io',
          testnet: false,
          supported: false,
        };
      case 137:
        return {
          id: 137,
          name: 'Polygon',
          symbol: 'MATIC',
          explorer: 'https://polygonscan.com',
          testnet: false,
          supported: true,
        };
      case 80002:
        return {
          id: 80002,
          name: 'Polygon Amoy',
          symbol: 'MATIC',
          explorer: 'https://amoy.polygonscan.com',
          testnet: true,
          supported: false,
        };
      default:
        return {
          id: targetChainId,
          name: 'Unknown Network',
          symbol: '?',
          explorer: '',
          testnet: false,
          supported: false,
        };
    }
  }, [targetChainId]);

  return chainInfo;
}

export interface MultiChainTokenBalance extends TokenBalance {
  chainId: number;
  chainName: string;
}

export function useMultiChainTokenBalances(chainIds: number[]) {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<Map<string, MultiChainTokenBalance>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Flatten all tokens with their chain info (configs to check)
  const tokensToCheck = useMemo(() => {
    if (!isConnected || !address || chainIds.length === 0) return [];

    const tokens: Array<{
      chainId: number;
      address: `0x${string}`;
      symbol: string;
      name: string;
      decimals: number;
      key: string;
    }> = [];

    chainIds.forEach((chainId) => {
      const chainTokens = COMMON_TOKENS[chainId] || [];
      chainTokens.forEach((token) => {
        tokens.push({
          chainId,
          ...token,
          key: `${chainId}-${token.address}`,
        });
      });
    });

    return tokens;
  }, [chainIds, address, isConnected]);

  // Fetch balances using public clients with optimized batching
  useEffect(() => {
    if (!isConnected || !address) {
      setTokenBalances(new Map());
      setIsLoading(false);
      return;
    }

    if (tokensToCheck.length === 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchBalances = async () => {
      const newBalances = new Map<string, MultiChainTokenBalance>();

      // Group tokens by chain for batch reading
      const tokensByChain = new Map<number, typeof tokensToCheck>();
      tokensToCheck.forEach((token) => {
        if (!tokensByChain.has(token.chainId)) {
          tokensByChain.set(token.chainId, []);
        }
        tokensByChain.get(token.chainId)!.push(token);
      });

      const getChainName = (id: number) => {
        switch (id) {
          case 1: return 'Ethereum';
          case 137: return 'Polygon';
          case 80002: return 'Polygon Amoy';
          default: return 'Unknown Network';
        }
      };

      // Create reusable public clients
      const publicClients = new Map<number, any>();

      // Fetch balances for each chain in parallel
      const promises = Array.from(tokensByChain.entries()).map(async ([chainId, tokens]) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        if (!chainConfig) return;

        // Reuse or create public client with explicit RPC URL
        if (!publicClients.has(chainId)) {
          const rpcUrl = RPC_URLS[chainId];
          publicClients.set(chainId, createPublicClient({
            chain: chainConfig,
            transport: http(rpcUrl),
            batch: {
              multicall: true, // Enable multicall for batching
            },
          }));
        }
        const publicClient = publicClients.get(chainId);

        // Batch fetch balances (only balanceOf, skip decimals since we have them)
        const balancePromises = tokens.map(async (token) => {
          try {
            // Skip contract code check for better performance
            const balance = await publicClient.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            }).catch(() => BigInt(0));

            const balanceBigInt = BigInt(balance?.toString() || '0');
            const zeroBigInt = BigInt(0);

            // Only include tokens with balance > 0
            if (balanceBigInt > zeroBigInt) {
              const divisor = BigInt(10 ** token.decimals);
              const formatted = (Number(balanceBigInt) / Number(divisor)).toFixed(6);

              if (isMounted) {
                newBalances.set(token.key, {
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  balance: balanceBigInt.toString(),
                  formatted,
                  isLoading: false,
                  chainId,
                  chainName: getChainName(chainId),
                });
              }
            }
          } catch (error) {
            // Silently fail for individual tokens
          }
        });

        await Promise.all(balancePromises);
      });

      await Promise.all(promises);

      if (isMounted) {
        setTokenBalances(newBalances);
        setIsLoading(false);
      }
    };

    fetchBalances();

    return () => {
      isMounted = false;
    };
  }, [tokensToCheck, address]);

  // Group results by chain
  const tokensByChain = useMemo(() => {
    const grouped: Record<number, MultiChainTokenBalance[]> = {};

    tokenBalances.forEach((token) => {
      if (!grouped[token.chainId]) {
        grouped[token.chainId] = [];
      }
      grouped[token.chainId].push(token);
    });

    return grouped;
  }, [tokenBalances]);

  // Convert Map to array for easier access
  const allTokensArray = useMemo(() => {
    return Array.from(tokenBalances.values());
  }, [tokenBalances]);

  return {
    tokensByChain,
    allTokens: allTokensArray,
    isLoading,
    totalTokens: tokenBalances.size,
  };
}

/**
 * Hook for fetching token balances using Etherscan API
 * Works with any address (embedded wallet or external)
 */
export function useEtherscanTokenBalances(walletAddress: string | null | undefined) {
  const [tokens, setTokens] = useState<FormattedTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setTokens([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchBalances = async () => {
      try {
        const tokenBalances = await getPolygonTokenBalances(walletAddress);
        if (isMounted) {
          setTokens(tokenBalances);
        }
      } catch (error) {
        console.error('Failed to fetch token balances via Etherscan:', error);
        if (isMounted) {
          setTokens([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBalances();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  // Group by chain (only Polygon for now)
  const tokensByChain = useMemo(() => {
    const grouped: Record<number, FormattedTokenBalance[]> = {};
    tokens.forEach((token) => {
      if (!grouped[token.chainId]) {
        grouped[token.chainId] = [];
      }
      grouped[token.chainId].push(token);
    });
    return grouped;
  }, [tokens]);

  return {
    tokens,
    tokensByChain,
    isLoading,
  };
}

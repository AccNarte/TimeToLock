/**
 * Etherscan API v2 utilities for fetching balances on Polygon
 * Documentation: https://docs.etherscan.io/etherscan-v2
 */

const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '';
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api';
const POLYGON_CHAIN_ID = 137;

export interface TokenBalance {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  balance: string;
}

export interface BalanceResult {
  nativeBalance: number; // POL balance in ether units
  nativeBalanceWei: string;
  tokens: TokenBalance[];
}

/**
 * Fetch native POL balance for an address
 */
export async function getNativeBalance(address: string): Promise<number> {
  try {
    const url = `${ETHERSCAN_V2_BASE}?chainid=${POLYGON_CHAIN_ID}&module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.result) {
      // Convert from wei to ether
      const balanceWei = BigInt(data.result);
      return Number(balanceWei) / 1e18;
    }

    console.error('Etherscan API error:', data.message, data.result);
    return 0;
  } catch (error) {
    console.error('Failed to fetch native balance:', error);
    return 0;
  }
}

// Known ERC20 tokens on Polygon to check
const POLYGON_TOKENS_TO_CHECK = [
  { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18 },
];

/**
 * Fetch balance for a specific ERC20 token
 */
async function getTokenBalance(walletAddress: string, tokenAddress: string): Promise<string> {
  try {
    const url = `${ETHERSCAN_V2_BASE}?chainid=${POLYGON_CHAIN_ID}&module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.result) {
      return data.result;
    }

    return '0';
  } catch (error) {
    console.error(`Failed to fetch token balance for ${tokenAddress}:`, error);
    return '0';
  }
}

/**
 * Delay helper to avoid rate limiting
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all known token balances for an address (sequential to avoid rate limit)
 */
export async function getTokenBalances(address: string): Promise<TokenBalance[]> {
  try {
    const results: TokenBalance[] = [];

    // Fetch token balances sequentially with delay to avoid rate limit (5/sec max)
    for (const token of POLYGON_TOKENS_TO_CHECK) {
      const balance = await getTokenBalance(address, token.address);
      results.push({
        contractAddress: token.address,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        tokenDecimal: token.decimals.toString(),
        balance,
      });
      // Wait 250ms between calls (max 4/sec to stay safe)
      await delay(250);
    }

    // Filter out zero balances
    return results.filter((token) => token.balance !== '0' && BigInt(token.balance) > 0n);
  } catch (error) {
    console.error('Failed to fetch token balances:', error);
    return [];
  }
}

/**
 * Fetch both native and token balances
 */
export async function getAllBalances(address: string): Promise<BalanceResult> {
  const [nativeBalance, tokens] = await Promise.all([
    getNativeBalance(address),
    getTokenBalances(address),
  ]);

  return {
    nativeBalance,
    nativeBalanceWei: (BigInt(Math.floor(nativeBalance * 1e18))).toString(),
    tokens,
  };
}

/**
 * Format token balance to human readable
 */
export function formatTokenBalance(balance: string, decimals: string | number): string {
  const dec = typeof decimals === 'string' ? parseInt(decimals) : decimals;
  const balanceBigInt = BigInt(balance);
  const divisor = BigInt(10 ** dec);
  const integerPart = balanceBigInt / divisor;
  const fractionalPart = balanceBigInt % divisor;

  // Format with decimals
  const fractionalStr = fractionalPart.toString().padStart(dec, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}

/**
 * Known token addresses on Polygon for balance lookup
 */
const POLYGON_KNOWN_TOKENS: Record<string, { symbol: string; decimals: number; name: string }> = {
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': { symbol: 'WMATIC', decimals: 18, name: 'Wrapped MATIC' },
  '0x0000000000000000000000000000000000001010': { symbol: 'MATIC', decimals: 18, name: 'Polygon' },
};

export interface FormattedTokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formatted: string;
  chainId: number;
  chainName: string;
}

/**
 * Get formatted token balances for a Polygon address using Etherscan API
 */
export async function getPolygonTokenBalances(address: string): Promise<FormattedTokenBalance[]> {
  const tokens = await getTokenBalances(address);

  return tokens.map((token) => {
    const knownToken = POLYGON_KNOWN_TOKENS[token.contractAddress.toLowerCase()];
    const decimals = parseInt(token.tokenDecimal) || 18;
    const balanceBigInt = BigInt(token.balance);
    const divisor = BigInt(10 ** decimals);
    const formatted = (Number(balanceBigInt) / Number(divisor)).toFixed(6);

    return {
      address: token.contractAddress,
      symbol: knownToken?.symbol || token.tokenSymbol,
      name: knownToken?.name || token.tokenName,
      decimals,
      balance: token.balance,
      formatted,
      chainId: POLYGON_CHAIN_ID,
      chainName: 'Polygon',
    };
  });
}

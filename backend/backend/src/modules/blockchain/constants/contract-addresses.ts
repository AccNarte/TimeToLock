/**
 * Smart contract addresses by chain ID
 * Update these after deploying to each network
 */
export const FACTORY_ADDRESSES: Record<number, string> = {
  // Polygon Mainnet
  137: process.env.FACTORY_ADDRESS_POLYGON || '',

  // Polygon Amoy Testnet
  80002: process.env.FACTORY_ADDRESS_AMOY || '',

  // Local Hardhat (for testing)
  31337: process.env.FACTORY_ADDRESS_LOCAL || '',
};

export function getFactoryAddress(chainId: number): string {
  const address = FACTORY_ADDRESSES[chainId];
  if (!address) {
    throw new Error(
      `Factory address not configured for chain ${chainId}. Please set the environment variable.`,
    );
  }
  return address;
}

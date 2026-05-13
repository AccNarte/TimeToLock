import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { getChainConfig } from '../constants/chain-configs';

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  /**
   * Get or create a JSON-RPC provider for a specific chain
   */
  getProvider(chainId: number): ethers.JsonRpcProvider {
    // Return cached provider if exists
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId)!;
    }

    // Create new provider
    const config = getChainConfig(chainId);
    this.logger.log(
      `Creating provider for ${config.name} (${chainId}) at ${config.rpcUrl}`,
    );

    const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
      chainId,
      name: config.name,
    });

    // Cache the provider
    this.providers.set(chainId, provider);

    return provider;
  }

  /**
   * Create a wallet signer from a private key
   */
  getWalletSigner(
    privateKey: string,
    chainId: number,
  ): ethers.Wallet {
    const provider = this.getProvider(chainId);
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    transaction: ethers.TransactionRequest,
    chainId: number,
  ): Promise<bigint> {
    const provider = this.getProvider(chainId);
    try {
      const gasEstimate = await provider.estimateGas(transaction);
      return gasEstimate;
    } catch (error) {
      this.logger.error(`Failed to estimate gas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(chainId: number): Promise<bigint> {
    const provider = this.getProvider(chainId);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Wait for a transaction to be mined
   */
  async waitForTransaction(
    txHash: string,
    chainId: number,
    confirmations: number = 1,
  ): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(chainId);
    this.logger.log(
      `Waiting for transaction ${txHash} (${confirmations} confirmations)`,
    );

    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations);

      if (receipt) {
        this.logger.log(
          `Transaction ${txHash} confirmed in block ${receipt.blockNumber}`,
        );
      } else {
        this.logger.warn(`Transaction ${txHash} returned null receipt`);
      }

      return receipt;
    } catch (error) {
      this.logger.error(`Failed to wait for transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    txHash: string,
    chainId: number,
  ): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(chainId);
    return await provider.getTransactionReceipt(txHash);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(chainId: number): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getBlockNumber();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: string, chainId: number): Promise<bigint> {
    const provider = this.getProvider(chainId);
    return await provider.getBalance(address);
  }

  /**
   * Check if an address is a contract
   */
  async isContract(address: string, chainId: number): Promise<boolean> {
    const provider = this.getProvider(chainId);
    const code = await provider.getCode(address);
    return code !== '0x';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { Web3Service } from './web3.service';
import { ContractService } from './contract.service';

export interface PreparedTransaction {
  to: string;
  data: string;
  gasLimit: bigint;
  gasPrice: bigint;
  value?: bigint;
}

export interface LockStatus {
  owner: string;
  token: string;
  amount: bigint;
  unlockTime: bigint;
  withdrawn: boolean;
  status: 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN';
}

@Injectable()
export class TimelockContractService {
  private readonly logger = new Logger(TimelockContractService.name);

  constructor(
    private readonly web3Service: Web3Service,
    private readonly contractService: ContractService,
  ) {}

  /**
   * Prepare createLock transaction data (for external wallets)
   */
  async prepareCreateLock(
    chainId: number,
    tokenAddress: string,
    amountWei: string,
    unlockAt: Date,
  ): Promise<PreparedTransaction> {
    this.logger.log(
      `Preparing createLock transaction for chain ${chainId}`,
    );

    const factory = this.contractService.getTimelockFactory(chainId);
    const unlockTimestamp = Math.floor(unlockAt.getTime() / 1000);

    // Encode function call
    const data = factory.interface.encodeFunctionData('createLock', [
      tokenAddress,
      amountWei,
      unlockTimestamp,
    ]);

    // Estimate gas
    const gasLimit = await this.web3Service.estimateGas(
      {
        to: await factory.getAddress(),
        data,
      },
      chainId,
    );

    const gasPrice = await this.web3Service.getGasPrice(chainId);

    return {
      to: await factory.getAddress(),
      data,
      gasLimit: gasLimit * 120n / 100n, // Add 20% buffer
      gasPrice,
    };
  }

  /**
   * Create lock with internal wallet (backend signs the transaction)
   */
  async createLockWithInternalWallet(
    privateKey: string,
    chainId: number,
    tokenAddress: string,
    amountWei: string,
    unlockAt: Date,
  ): Promise<{ txHash: string; lockAddress?: string }> {
    this.logger.log(
      `Creating lock with internal wallet on chain ${chainId}`,
    );

    try {
      // Create signer
      const signer = this.web3Service.getWalletSigner(privateKey, chainId);

      // Get contracts with signer
      const factory = this.contractService.getTimelockFactory(chainId, signer);
      const token = this.contractService.getERC20Contract(
        tokenAddress,
        chainId,
        signer,
      );

      const unlockTimestamp = Math.floor(unlockAt.getTime() / 1000);

      // Step 1: Check allowance
      const factoryAddress = await factory.getAddress();
      const signerAddress = await signer.getAddress();
      const allowance = await token.allowance(signerAddress, factoryAddress);

      // Step 2: Approve if needed
      if (allowance < BigInt(amountWei)) {
        this.logger.log(`Approving ${amountWei} tokens...`);
        const approveTx = await token.approve(factoryAddress, amountWei);
        await approveTx.wait();
        this.logger.log(`Tokens approved`);
      }

      // Step 3: Create lock
      this.logger.log(`Creating lock...`);
      const createTx = await factory.createLock(
        tokenAddress,
        amountWei,
        unlockTimestamp,
      );

      this.logger.log(`Transaction sent: ${createTx.hash}`);

      // Wait for confirmation
      const receipt = await createTx.wait();
      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse LockCreated event to get vault address
      const lockCreatedEvents = this.contractService.parseEventLogs(
        receipt,
        factory.interface,
        'LockCreated',
      );

      let lockAddress: string | undefined;
      if (lockCreatedEvents.length > 0) {
        lockAddress = lockCreatedEvents[0].args[0]; // First arg is lockAddress
        this.logger.log(`Lock created at address: ${lockAddress}`);
      }

      return {
        txHash: receipt.hash,
        lockAddress,
      };
    } catch (error) {
      this.logger.error(`Failed to create lock: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse lock address from transaction receipt
   */
  async parseLockAddressFromReceipt(
    txHash: string,
    chainId: number,
  ): Promise<string | null> {
    try {
      const receipt = await this.web3Service.getTransactionReceipt(
        txHash,
        chainId,
      );

      if (!receipt) {
        this.logger.warn(`Transaction receipt not found: ${txHash}`);
        return null;
      }

      const factory = this.contractService.getTimelockFactory(chainId);
      const lockCreatedEvents = this.contractService.parseEventLogs(
        receipt,
        factory.interface,
        'LockCreated',
      );

      if (lockCreatedEvents.length > 0) {
        return lockCreatedEvents[0].args[0]; // lockAddress
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to parse lock address from receipt: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Withdraw from lock
   */
  async withdrawFromLock(
    privateKey: string,
    lockAddress: string,
    chainId: number,
  ): Promise<string> {
    this.logger.log(`Withdrawing from lock ${lockAddress}`);

    try {
      const signer = this.web3Service.getWalletSigner(privateKey, chainId);
      const vault = this.contractService.getTimelockVault(
        lockAddress,
        chainId,
        signer,
      );

      // Check if unlockable
      const status = await this.getLockStatus(lockAddress, chainId);
      if (status.status !== 'UNLOCKABLE') {
        throw new Error(
          `Lock is not yet unlockable. Current status: ${status.status}`,
        );
      }

      // Withdraw
      const tx = await vault.withdraw();
      this.logger.log(`Withdraw transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      this.logger.log(`Withdraw confirmed in block ${receipt.blockNumber}`);

      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to withdraw: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get lock status
   */
  async getLockStatus(
    lockAddress: string,
    chainId: number,
  ): Promise<LockStatus> {
    try {
      const vault = this.contractService.getTimelockVault(
        lockAddress,
        chainId,
      );

      // Get details
      const [owner, token, amount, unlockTime, withdrawn] =
        await vault.getLockDetails();

      // Get status enum
      const statusEnum = await vault.getStatus();

      let status: 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN';
      switch (Number(statusEnum)) {
        case 0:
          status = 'LOCKED';
          break;
        case 1:
          status = 'UNLOCKABLE';
          break;
        case 2:
          status = 'WITHDRAWN';
          break;
        default:
          status = 'LOCKED';
      }

      return {
        owner,
        token,
        amount,
        unlockTime,
        withdrawn,
        status,
      };
    } catch (error) {
      this.logger.error(`Failed to get lock status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all locks for a user from factory
   */
  async getUserLocks(
    userAddress: string,
    chainId: number,
  ): Promise<string[]> {
    try {
      const factory = this.contractService.getTimelockFactory(chainId);
      const locks = await factory.getUserLocks(userAddress);
      return locks;
    } catch (error) {
      this.logger.error(`Failed to get user locks: ${error.message}`);
      throw error;
    }
  }
}

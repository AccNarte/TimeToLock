import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoLock } from './crypto-lock.entity';
import { CreateCryptoLockDto } from './dto/create-crypto-lock.dto';
import { SaveLockFromFrontendDto } from './dto/save-lock-from-frontend.dto';
import { TimelockContractService } from '../blockchain/services/timelock-contract.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

@Injectable()
export class TimelockCryptoService {
  private readonly logger = new Logger(TimelockCryptoService.name);

  constructor(
    @InjectRepository(CryptoLock)
    private cryptoLockRepository: Repository<CryptoLock>,
    private readonly timelockContractService: TimelockContractService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCryptoLockDto): Promise<CryptoLock> {
    // Stub: Create crypto lock
    const cryptoLock = this.cryptoLockRepository.create({
      userWalletId: dto.walletId,
      tokenContractId: dto.tokenContractId,
      amountWei: dto.amountWei,
      unlockAt: new Date(dto.unlockAt),
      status: 'LOCKED',
    });
    return this.cryptoLockRepository.save(cryptoLock);
  }

  /**
   * Save a lock created from the frontend (user signed transaction)
   */
  async saveLockFromFrontend(
    dto: SaveLockFromFrontendDto,
    userId?: number,
  ): Promise<CryptoLock> {
    this.logger.log(`Saving lock from frontend: ${dto.lockContractAddress}`);

    const cryptoLock = this.cryptoLockRepository.create({
      userWalletId: dto.walletId,
      tokenContractId: dto.tokenContractId,
      amountWei: dto.amountWei,
      unlockAt: new Date(dto.unlockAt),
      lockedTxHash: dto.txHash,
      lockContractAddress: dto.lockContractAddress,
      status: 'LOCKED',
    });

    const saved = await this.cryptoLockRepository.save(cryptoLock);
    await this.auditService.log({
      action: AUDIT_ACTIONS.CRYPTO_LOCK_CREATED,
      entityType: AUDIT_ENTITIES.CRYPTO_LOCK,
      entityId: saved.id,
      userId: userId ?? null,
      userWalletId: dto.walletId,
      metadata: {
        amountWei: dto.amountWei,
        unlockAt: dto.unlockAt,
        contract: dto.lockContractAddress,
        txHash: dto.txHash,
      },
    });
    return saved;
  }

  async findAllByWallet(walletId: number): Promise<CryptoLock[]> {
    // Stub: Get all crypto locks for wallet
    return this.cryptoLockRepository.find({ where: { userWalletId: walletId } });
  }

  async findById(id: number): Promise<CryptoLock | null> {
    // Stub: Find crypto lock by ID
    return this.cryptoLockRepository.findOne({ where: { id } });
  }

  async findAllByUser(userId: number): Promise<any[]> {
    // Get all crypto locks for user (through wallet relation)
    const locks = await this.cryptoLockRepository.find({
      relations: ['wallet', 'tokenContract', 'tokenContract.network', 'tokenContract.token'],
      where: { wallet: { userId } },
    });

    // Sync status from blockchain and transform for frontend
    const transformedLocks = [];

    for (const lock of locks) {
      // Sync status from blockchain
      if (lock.lockContractAddress && lock.tokenContract?.network) {
        try {
          const onChainStatus = await this.timelockContractService.getLockStatus(
            lock.lockContractAddress,
            lock.tokenContract.network.chainId,
          );

          // Update status if different
          if (lock.status !== onChainStatus.status) {
            lock.status = onChainStatus.status;
            await this.cryptoLockRepository.save(lock);
          }
        } catch (error) {
          this.logger.error(`Failed to sync status for lock ${lock.id}: ${error.message}`);
        }
      }

      // Transform for frontend
      const decimals = lock.tokenContract?.token?.decimals || 18;
      const amountFormatted = (parseFloat(lock.amountWei) / Math.pow(10, decimals)).toString();

      transformedLocks.push({
        id: lock.id.toString(),
        userWalletId: lock.userWalletId.toString(),
        tokenSymbol: lock.tokenContract?.token?.symbol || 'UNKNOWN',
        tokenDecimals: decimals,
        chainName: lock.tokenContract?.network?.name || 'Unknown',
        chainId: lock.tokenContract?.network?.chainId,
        tokenAddress: lock.tokenContract?.contractAddress,
        lockContractAddress: lock.lockContractAddress,
        amountWei: lock.amountWei,
        amountFormatted,
        unlockAt: lock.unlockAt.toISOString(),
        lockedTxHash: lock.lockedTxHash,
        withdrawTxHash: lock.withdrawTxHash,
        status: lock.status.toLowerCase() as 'locked' | 'unlockable' | 'withdrawn',
        createdAt: lock.createdAt.toISOString(),
        updatedAt: lock.updatedAt.toISOString(),
      });
    }

    return transformedLocks;
  }

  /**
   * Sync lock status from blockchain
   */
  async syncLockStatus(lockId: number, chainId: number): Promise<CryptoLock> {
    const lock = await this.findById(lockId);
    if (!lock || !lock.lockContractAddress) {
      throw new Error('Lock not found or no contract address');
    }

    const onChainStatus = await this.timelockContractService.getLockStatus(
      lock.lockContractAddress,
      chainId,
    );

    lock.status = onChainStatus.status;
    return this.cryptoLockRepository.save(lock);
  }

  /**
   * Mark a lock as withdrawn after successful blockchain transaction
   */
  async markAsWithdrawn(lockId: number, txHash: string, userId: number): Promise<CryptoLock> {
    const lock = await this.cryptoLockRepository.findOne({
      where: { id: lockId },
      relations: ['wallet'],
    });

    if (!lock) {
      throw new NotFoundException(`Lock ${lockId} not found`);
    }

    // Verify the lock belongs to the user
    if (lock.wallet?.userId !== userId) {
      throw new ForbiddenException('You do not own this lock');
    }

    // Update status to withdrawn
    lock.status = 'WITHDRAWN';
    lock.withdrawTxHash = txHash;

    this.logger.log(`Marking lock ${lockId} as withdrawn. TX: ${txHash}`);

    const saved = await this.cryptoLockRepository.save(lock);
    await this.auditService.log({
      action: AUDIT_ACTIONS.CRYPTO_LOCK_WITHDRAWN,
      entityType: AUDIT_ENTITIES.CRYPTO_LOCK,
      entityId: lockId,
      userId,
      userWalletId: lock.userWalletId,
      metadata: { txHash },
    });
    return saved;
  }
}

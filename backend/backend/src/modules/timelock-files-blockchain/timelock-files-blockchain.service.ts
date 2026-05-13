import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainFileLock, BlockchainFileLockStatus } from './blockchain-file-lock.entity';
import { CreateBlockchainFileLockDto } from './dto/create-blockchain-file-lock.dto';
import { IpfsService } from '../ipfs/ipfs.service';

@Injectable()
export class TimelockFilesBlockchainService {
  private readonly logger = new Logger(TimelockFilesBlockchainService.name);

  constructor(
    @InjectRepository(BlockchainFileLock)
    private readonly fileLockRepository: Repository<BlockchainFileLock>,
    private readonly ipfsService: IpfsService,
  ) {}

  /**
   * Create a new blockchain file lock record
   * Called after the frontend has created the lock on blockchain and uploaded to IPFS
   */
  async create(
    userId: number,
    dto: CreateBlockchainFileLockDto,
  ): Promise<BlockchainFileLock> {
    this.logger.log(`Creating blockchain file lock for user ${userId}`);

    const fileLock = this.fileLockRepository.create({
      userId,
      walletId: dto.walletId,
      title: dto.title || dto.filename,
      filename: dto.filename,
      mimeType: dto.mimeType || 'application/octet-stream',
      sizeBytes: dto.sizeBytes,
      ipfsHash: dto.ipfsHash,
      lockedTxHash: dto.txHash,
      lockContractAddress: dto.lockContractAddress,
      chainId: dto.chainId,
      unlockAt: new Date(dto.unlockAt),
      status: 'LOCKED',
    });

    const saved = await this.fileLockRepository.save(fileLock);
    this.logger.log(`Created blockchain file lock ${saved.id} for user ${userId}`);

    return saved;
  }

  /**
   * Find all blockchain file locks for a user
   * Automatically syncs status based on unlock time
   */
  async findAllByUser(userId: number): Promise<BlockchainFileLock[]> {
    const locks = await this.fileLockRepository.find({
      where: { userId },
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
    });

    const now = new Date();

    // Sync status based on time
    for (const lock of locks) {
      if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
        lock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(lock);
      }
    }

    return locks;
  }

  /**
   * Find a specific blockchain file lock by ID
   */
  async findById(
    id: number,
    userId: number,
  ): Promise<BlockchainFileLock | null> {
    const lock = await this.fileLockRepository.findOne({
      where: { id, userId },
      relations: ['wallet'],
    });

    if (lock) {
      // Sync status based on time
      const now = new Date();
      if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
        lock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(lock);
      }
    }

    return lock;
  }

  /**
   * Get the IPFS gateway URL for a file
   * Only returns if the file is unlockable
   */
  async getIpfsUrl(id: number, userId: number): Promise<string> {
    const lock = await this.findById(id, userId);

    if (!lock) {
      throw new NotFoundException('File lock not found');
    }

    const now = new Date();
    if (lock.unlockAt > now) {
      throw new ForbiddenException('File is still locked');
    }

    return this.ipfsService.getGatewayUrl(lock.ipfsHash);
  }

  /**
   * Mark a file lock as unlocked
   * Called after the user has successfully retrieved the key from the blockchain
   */
  async markAsUnlocked(id: number, userId: number): Promise<BlockchainFileLock> {
    const lock = await this.findById(id, userId);

    if (!lock) {
      throw new NotFoundException('File lock not found');
    }

    lock.status = 'UNLOCKED';
    lock.unlockedAt = new Date();

    const saved = await this.fileLockRepository.save(lock);
    this.logger.log(`Marked file lock ${id} as unlocked for user ${userId}`);

    return saved;
  }

  /**
   * Sync the status of a file lock
   * Updates based on unlock time
   */
  async syncStatus(id: number, userId: number): Promise<BlockchainFileLock> {
    const lock = await this.fileLockRepository.findOne({
      where: { id, userId },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    const now = new Date();
    let newStatus: BlockchainFileLockStatus = lock.status;

    if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
      newStatus = 'UNLOCKABLE';
    }

    if (newStatus !== lock.status) {
      lock.status = newStatus;
      await this.fileLockRepository.save(lock);
      this.logger.log(`Synced file lock ${id} status to ${newStatus}`);
    }

    return lock;
  }

  /**
   * Get statistics for a user's file locks
   */
  async getUserStats(userId: number): Promise<{
    total: number;
    locked: number;
    unlockable: number;
    unlocked: number;
    totalSizeBytes: number;
  }> {
    const locks = await this.fileLockRepository.find({
      where: { userId },
    });

    const now = new Date();
    let locked = 0;
    let unlockable = 0;
    let unlocked = 0;
    let totalSizeBytes = 0;

    for (const lock of locks) {
      totalSizeBytes += Number(lock.sizeBytes);

      if (lock.status === 'UNLOCKED') {
        unlocked++;
      } else if (lock.unlockAt <= now) {
        unlockable++;
      } else {
        locked++;
      }
    }

    return {
      total: locks.length,
      locked,
      unlockable,
      unlocked,
      totalSizeBytes,
    };
  }

  /**
   * Delete a file lock record
   * Note: This does NOT unpin from IPFS or affect the blockchain contract
   */
  async delete(id: number, userId: number): Promise<void> {
    const lock = await this.findById(id, userId);

    if (!lock) {
      throw new NotFoundException('File lock not found');
    }

    await this.fileLockRepository.delete({ id, userId });
    this.logger.log(`Deleted file lock ${id} for user ${userId}`);
  }
}

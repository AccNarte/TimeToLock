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
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

/**
 * Service de persistance des verrous de fichier on-chain (Files Blockchain).
 *
 * Comme pour les verrous crypto, l'essentiel se fait côté front :
 *   1. chiffrement AES-256-GCM du fichier dans le navigateur,
 *   2. upload du ciphertext sur IPFS via Pinata,
 *   3. création du Vault on-chain par le wallet de l'utilisateur.
 *
 * Le backend ne stocke que les métadonnées (CID IPFS, hash de tx,
 * adresse du Vault, dates, taille…) et gère la destruction (unpin Pinata
 * + suppression DB).
 */
@Injectable()
export class TimelockFilesBlockchainService {
  private readonly logger = new Logger(TimelockFilesBlockchainService.name);

  constructor(
    @InjectRepository(BlockchainFileLock)
    private readonly fileLockRepository: Repository<BlockchainFileLock>,
    private readonly ipfsService: IpfsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Enregistre un nouveau verrou de fichier on-chain. Appelé par le front
   * une fois le ciphertext uploadé sur IPFS et le Vault créé on-chain.
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

    await this.auditService.log({
      action: AUDIT_ACTIONS.FILE_LOCK_CREATED,
      entityType: AUDIT_ENTITIES.FILE_LOCK,
      entityId: saved.id,
      userId,
      userWalletId: dto.walletId,
      metadata: {
        filename: saved.filename,
        ipfsHash: saved.ipfsHash,
        contract: saved.lockContractAddress,
        unlockAt: dto.unlockAt,
      },
    });

    return saved;
  }

  /**
   * Renvoie tous les verrous de fichier d'un utilisateur, avec resync
   * automatique du statut (LOCKED → UNLOCKABLE) si la date est passée.
   */
  async findAllByUser(userId: number): Promise<BlockchainFileLock[]> {
    const locks = await this.fileLockRepository.find({
      where: { userId },
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
    });

    const now = new Date();

    // Passage automatique LOCKED → UNLOCKABLE pour les verrous arrivés à échéance.
    for (const lock of locks) {
      if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
        lock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(lock);
      }
    }

    return locks;
  }

  /** Récupère un verrou par son id, avec resync du statut si besoin. */
  async findById(
    id: number,
    userId: number,
  ): Promise<BlockchainFileLock | null> {
    const lock = await this.fileLockRepository.findOne({
      where: { id, userId },
      relations: ['wallet'],
    });

    if (lock) {
      // Passage LOCKED → UNLOCKABLE si l'échéance est dépassée.
      const now = new Date();
      if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
        lock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(lock);
      }
    }

    return lock;
  }

  /**
   * Renvoie l'URL du gateway IPFS pour récupérer le ciphertext.
   * Renvoie un 403 tant que la date de déverrouillage n'est pas atteinte.
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
   * Marque le verrou comme déverrouillé. Appelé par le front une fois
   * que la clé a été récupérée du Vault on-chain et le fichier déchiffré.
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
   * Resync ponctuelle du statut d'un verrou (basé sur l'écoulement du temps).
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

  /** Statistiques des verrous de fichier d'un utilisateur. */
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
   * Destruction définitive d'un verrou de fichier : unpin Pinata +
   * suppression de la ligne en base.
   *
   * Le smart contract (qui contient la clé AES chiffrée) reste tel quel,
   * mais sans le payload IPFS, ces données on-chain n'ont plus aucune
   * valeur cryptographique. Après cet appel, ni l'utilisateur ni les
   * admins ne peuvent récupérer le fichier depuis notre infrastructure.
   *
   * Le CID peut techniquement subsister sur d'autres nœuds IPFS qui
   * l'auraient pinné, mais Pinata ne le servira plus.
   */
  async delete(id: number, userId: number): Promise<{ unpinned: boolean }> {
    const lock = await this.findById(id, userId);

    if (!lock) {
      throw new NotFoundException('File lock not found');
    }

    // Unpin best-effort : on supprime la ligne DB même si Pinata refuse,
    // sinon l'utilisateur reste bloqué. On remonte juste le résultat
    // pour que le front puisse l'avertir si le fichier risque de
    // persister sur le réseau.
    let unpinned = false;
    if (lock.ipfsHash) {
      try {
        unpinned = await this.ipfsService.unpinFile(lock.ipfsHash);
      } catch (err: any) {
        this.logger.warn(
          `Unpin failed for lock ${id} (cid=${lock.ipfsHash}): ${err.message}`,
        );
      }
    }

    await this.fileLockRepository.delete({ id, userId });
    this.logger.log(
      `Destroyed file lock ${id} for user ${userId} (unpinned=${unpinned})`,
    );

    return { unpinned };
  }
}

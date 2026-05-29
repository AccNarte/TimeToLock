import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoLock } from './crypto-lock.entity';
import { CreateCryptoLockDto } from './dto/create-crypto-lock.dto';
import { SaveLockFromFrontendDto } from './dto/save-lock-from-frontend.dto';
import { TimelockContractService } from '../blockchain/services/timelock-contract.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

/**
 * Service de persistance des verrous crypto.
 *
 * La création réelle du verrou se fait **côté front** (le wallet signe
 * la transaction et l'envoie au smart contract). Le backend ne fait que
 * conserver les métadonnées (montant, date, adresse du Vault, hash de
 * tx, statut) pour pouvoir :
 *   - les lister dans le dashboard de l'utilisateur,
 *   - resynchroniser leur statut on-chain au besoin,
 *   - journaliser les événements dans `audit_logs`.
 */
@Injectable()
export class TimelockCryptoService {
  private readonly logger = new Logger(TimelockCryptoService.name);

  constructor(
    @InjectRepository(CryptoLock)
    private cryptoLockRepository: Repository<CryptoLock>,
    private readonly timelockContractService: TimelockContractService,
    private readonly auditService: AuditService,
  ) {}

  /** Création d'un verrou en base (cas legacy — la voie normale passe par `saveLockFromFrontend`). */
  async create(dto: CreateCryptoLockDto): Promise<CryptoLock> {
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
   * Sauvegarde d'un verrou créé depuis le front (le wallet de
   * l'utilisateur a signé et envoyé la transaction de création). On
   * récupère l'adresse du Vault et le hash de tx pour les stocker, puis
   * on journalise l'événement.
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

  /** Renvoie tous les verrous associés à un wallet donné. */
  async findAllByWallet(walletId: number): Promise<CryptoLock[]> {
    return this.cryptoLockRepository.find({ where: { userWalletId: walletId } });
  }

  async findById(id: number): Promise<CryptoLock | null> {
    return this.cryptoLockRepository.findOne({ where: { id } });
  }

  /**
   * Renvoie tous les verrous d'un utilisateur, transformés pour le front
   * (ajout du symbole du token, du nom du réseau, du montant formaté,
   * etc.) et avec leur statut resynchronisé depuis la blockchain à la volée.
   */
  async findAllByUser(userId: number): Promise<any[]> {
    // Récupération via la relation user → wallets → cryptoLocks.
    const locks = await this.cryptoLockRepository.find({
      relations: ['wallet', 'tokenContract', 'tokenContract.network', 'tokenContract.token'],
      where: { wallet: { userId } },
    });

    // Resync du statut on-chain + transformation pour le front.
    const transformedLocks = [];

    for (const lock of locks) {
      // Lecture du statut on-chain (si on a l'adresse du Vault).
      if (lock.lockContractAddress && lock.tokenContract?.network) {
        try {
          const onChainStatus = await this.timelockContractService.getLockStatus(
            lock.lockContractAddress,
            lock.tokenContract.network.chainId,
          );

          // Mise à jour en base si désynchronisé.
          if (lock.status !== onChainStatus.status) {
            lock.status = onChainStatus.status;
            await this.cryptoLockRepository.save(lock);
          }
        } catch (error) {
          this.logger.error(`Failed to sync status for lock ${lock.id}: ${error.message}`);
        }
      }

      // Mise en forme pour le front.
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

  /** Resync ponctuelle du statut d'un verrou depuis la blockchain. */
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
   * Marque un verrou comme retiré après que l'utilisateur a fait passer
   * la transaction de retrait on-chain. Vérifie au préalable que le
   * verrou appartient bien à l'utilisateur appelant.
   */
  async markAsWithdrawn(lockId: number, txHash: string, userId: number): Promise<CryptoLock> {
    const lock = await this.cryptoLockRepository.findOne({
      where: { id: lockId },
      relations: ['wallet'],
    });

    if (!lock) {
      throw new NotFoundException(`Lock ${lockId} not found`);
    }

    // Vérification de propriété : on refuse qu'un utilisateur marque le
    // retrait d'un verrou qui n'est pas le sien.
    if (lock.wallet?.userId !== userId) {
      throw new ForbiddenException('You do not own this lock');
    }

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

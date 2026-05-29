import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { ethers } from 'ethers';
import { User } from '../users/user.entity';
import { ListUsersDto } from './dto/list-users.dto';
import { verifyPassword, hashPassword } from '../../common/utils/password.util';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';
import { BlockchainFileLock } from '../timelock-files-blockchain/blockchain-file-lock.entity';
import { FileLock } from '../timelock-files/file-lock.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Role } from '../roles/role.entity';

/** Statistiques globales affichées en tête du panel admin. */
export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    passwordAuth: number;
    walletAuth: number;
    passwordAuthPercent: number;
    walletAuthPercent: number;
    verifiedEmail: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  cryptoLocks: {
    total: number;
    locked: number;
    unlockable: number;
    withdrawn: number;
  };
  fileLocks: {
    total: number;
    locked: number;
    unlockable: number;
    unlocked: number;
    totalSizeBytes: number;
  };
  filesClassic: {
    total: number;
    locked: number;
    unlockable: number;
    unlocked: number;
  };
  wallets: {
    total: number;
    internal: number;
    external: number;
  };
}

/** Ligne affichée dans la table utilisateurs du panel admin. */
export interface UserListItem {
  id: number;
  email: string | null;
  loginMethod: string;
  isEmailVerified: boolean;
  status: 'active' | 'banned';
  bannedAt: Date | null;
  roleName: string | null;
  walletsCount: number;
  cryptoLocksCount: number;
  fileLocksCount: number;
  createdAt: Date;
}

/** Enveloppe paginée renvoyée par `listUsers`. */
export interface PaginatedUsers {
  items: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service central du panel d'administration.
 *
 * Couvre :
 *  - les statistiques globales (`getStats`),
 *  - le CRUD avancé sur les utilisateurs (listing paginé/filtré/triable,
 *    export CSV, modification email/rôle/mdp, suspension/réactivation,
 *    suppression),
 *  - la re-authentification de l'admin pour toute action sensible
 *    (`verifyAdminChallenge`) — mot de passe pour les admins email, ou
 *    signature wallet horodatée pour les admins wallet.
 *
 * Toutes les mutations sensibles sont journalisées via `AuditService`.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CryptoLock)
    private cryptoLocksRepository: Repository<CryptoLock>,
    @InjectRepository(BlockchainFileLock)
    private blockchainFileLocksRepository: Repository<BlockchainFileLock>,
    @InjectRepository(FileLock)
    private fileLocksRepository: Repository<FileLock>,
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  /** Renvoie true si l'utilisateur a le rôle `admin` ou `superadmin`. */
  async checkAdminAccess(userId: number): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user || !user.role) {
      return false;
    }

    return user.role.name === 'admin' || user.role.name === 'superadmin';
  }

  /** Calcule l'ensemble des stats du dashboard admin. */
  async getStats(): Promise<AdminStats> {
    // Stats utilisateurs.
    // Les comptes wallet ont un email auto-généré `wallet_<adresse>@timelock.local`
    // (généré au login wallet). On les détecte par ce suffixe plutôt que via la
    // colonne `loginMethod`, qui est restée incohérente sur les vieux comptes.
    const totalUsers = await this.usersRepository.count();
    const walletAuthUsers = await this.usersRepository.count({
      where: { email: ILike('%@timelock.local') },
    });
    const passwordAuthUsers = totalUsers - walletAuthUsers;
    const verifiedEmailUsers = await this.usersRepository.count({
      where: { isEmailVerified: true },
    });
    const bannedUsers = await this.usersRepository.count({
      where: { status: 'banned' },
    });
    const activeUsers = totalUsers - bannedUsers;

    // Nouveaux comptes sur les 7 derniers jours.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneWeekAgo })
      .getCount();

    // Nouveaux comptes sur le dernier mois.
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newThisMonth = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneMonthAgo })
      .getCount();

    // Stats verrous crypto.
    const totalCryptoLocks = await this.cryptoLocksRepository.count();
    const lockedCrypto = await this.cryptoLocksRepository.count({
      where: { status: 'LOCKED' },
    });
    const unlockableCrypto = await this.cryptoLocksRepository.count({
      where: { status: 'UNLOCKABLE' },
    });
    const withdrawnCrypto = await this.cryptoLocksRepository.count({
      where: { status: 'WITHDRAWN' },
    });

    // Stats verrous de fichier on-chain (Files Blockchain).
    const totalFileLocks = await this.blockchainFileLocksRepository.count();
    const lockedFiles = await this.blockchainFileLocksRepository.count({
      where: { status: 'LOCKED' },
    });
    const unlockableFiles = await this.blockchainFileLocksRepository.count({
      where: { status: 'UNLOCKABLE' },
    });
    const unlockedFiles = await this.blockchainFileLocksRepository.count({
      where: { status: 'UNLOCKED' },
    });

    // Taille totale cumulée des fichiers verrouillés on-chain.
    const sizeResult = await this.blockchainFileLocksRepository
      .createQueryBuilder('file')
      .select('COALESCE(SUM(file.sizeBytes), 0)', 'totalSize')
      .getRawOne();
    const totalSizeBytes = parseInt(sizeResult?.totalSize || '0', 10);

    // Stats verrous de fichier "classiques" (ciphertext stocké en base).
    const totalClassicFiles = await this.fileLocksRepository.count();
    const lockedClassic = await this.fileLocksRepository.count({
      where: { status: 'locked' },
    });
    const unlockableClassic = await this.fileLocksRepository.count({
      where: { status: 'unlockable' },
    });
    const unlockedClassic = await this.fileLocksRepository.count({
      where: { status: 'unlocked' },
    });

    // Stats wallets (interne = wallet embarqué, externe = MetaMask/Rabby lié).
    const totalWallets = await this.walletsRepository.count();
    const internalWallets = await this.walletsRepository.count({
      where: { type: 'internal' },
    });
    const externalWallets = await this.walletsRepository.count({
      where: { type: 'external' },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        passwordAuth: passwordAuthUsers,
        walletAuth: walletAuthUsers,
        passwordAuthPercent: totalUsers > 0 ? Math.round((passwordAuthUsers / totalUsers) * 100) : 0,
        walletAuthPercent: totalUsers > 0 ? Math.round((walletAuthUsers / totalUsers) * 100) : 0,
        verifiedEmail: verifiedEmailUsers,
        newThisWeek,
        newThisMonth,
      },
      cryptoLocks: {
        total: totalCryptoLocks,
        locked: lockedCrypto,
        unlockable: unlockableCrypto,
        withdrawn: withdrawnCrypto,
      },
      fileLocks: {
        total: totalFileLocks,
        locked: lockedFiles,
        unlockable: unlockableFiles,
        unlocked: unlockedFiles,
        totalSizeBytes,
      },
      filesClassic: {
        total: totalClassicFiles,
        locked: lockedClassic,
        unlockable: unlockableClassic,
        unlocked: unlockedClassic,
      },
      wallets: {
        total: totalWallets,
        internal: internalWallets,
        external: externalWallets,
      },
    };
  }

  /**
   * Construit la requête utilisateurs en appliquant tous les filtres de
   * listing (recherche / rôle / statut / méthode d'auth / vérification
   * email). Partagée entre le listing paginé et l'export CSV pour
   * garantir que les deux honorent exactement les mêmes critères.
   */
  private buildUserQuery(dto: ListUsersDto): SelectQueryBuilder<User> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.wallets', 'wallets');

    if (dto.q) {
      qb.andWhere('user.email ILIKE :q', { q: `%${dto.q}%` });
    }
    if (dto.role) {
      qb.andWhere('role.name = :role', { role: dto.role });
    }
    if (dto.status && dto.status !== 'all') {
      qb.andWhere('user.status = :status', { status: dto.status });
    }
    if (dto.auth && dto.auth !== 'all') {
      // Les comptes wallet portent le suffixe @timelock.local (cf. getStats).
      qb.andWhere(
        dto.auth === 'wallet'
          ? 'user.email ILIKE :suffix'
          : '(user.email NOT ILIKE :suffix OR user.email IS NULL)',
        { suffix: '%@timelock.local' },
      );
    }
    if (dto.verified && dto.verified !== 'all') {
      qb.andWhere('user.isEmailVerified = :verified', {
        verified: dto.verified === 'true',
      });
    }
    return qb;
  }

  /** Compte les locks crypto et fichiers pour un ensemble d'ids utilisateurs. */
  private async countsForUsers(userIds: number[]): Promise<{
    crypto: Map<number, number>;
    files: Map<number, number>;
  }> {
    const crypto = new Map<number, number>();
    const files = new Map<number, number>();
    if (userIds.length === 0) return { crypto, files };

    const cryptoRows = await this.cryptoLocksRepository
      .createQueryBuilder('cl')
      .select('w.userId', 'userId')
      .addSelect('COUNT(cl.id)', 'count')
      .innerJoin('cl.wallet', 'w')
      .where('w.userId IN (:...ids)', { ids: userIds })
      .groupBy('w.userId')
      .getRawMany();
    cryptoRows.forEach((r) => crypto.set(parseInt(r.userId), parseInt(r.count)));

    const fileRows = await this.blockchainFileLocksRepository
      .createQueryBuilder('fl')
      .select('fl.userId', 'userId')
      .addSelect('COUNT(fl.id)', 'count')
      .where('fl.userId IN (:...ids)', { ids: userIds })
      .groupBy('fl.userId')
      .getRawMany();
    fileRows.forEach((r) => files.set(parseInt(r.userId), parseInt(r.count)));

    return { crypto, files };
  }

  /** Transforme une ligne `User` + ses compteurs en DTO pour le front. */
  private toListItem(
    user: User,
    crypto: Map<number, number>,
    files: Map<number, number>,
  ): UserListItem {
    return {
      id: user.id,
      email: user.email,
      // Même heuristique que `getStats` : on se fie au suffixe
      // @timelock.local plutôt qu'à la colonne `loginMethod`, qui a un
      // historique d'incohérences sur les vieux comptes.
      loginMethod: user.email?.toLowerCase().endsWith('@timelock.local')
        ? 'wallet'
        : 'password',
      isEmailVerified: user.isEmailVerified,
      status: (user.status as 'active' | 'banned') || 'active',
      bannedAt: user.bannedAt ?? null,
      roleName: user.role?.name || null,
      walletsCount: user.wallets?.length || 0,
      cryptoLocksCount: crypto.get(user.id) || 0,
      fileLocksCount: files.get(user.id) || 0,
      createdAt: user.createdAt,
    };
  }

  /**
   * Listing utilisateurs avancé : pagination + recherche + filtres
   * multi-critères + tri sur colonnes whitelistées.
   */
  async listUsers(dto: ListUsersDto): Promise<PaginatedUsers> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.buildUserQuery(dto)
      .orderBy(`user.${dto.sort ?? 'createdAt'}`, dto.order ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();
    const { crypto, files } = await this.countsForUsers(users.map((u) => u.id));

    return {
      items: users.map((u) => this.toListItem(u, crypto, files)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Export CSV de l'ensemble filtré (sans pagination — toutes les lignes
   * matching).  Format RFC-4180 : quoting des valeurs contenant virgule,
   * guillemet ou saut de ligne.
   */
  async exportUsersCsv(dto: ListUsersDto): Promise<string> {
    const qb = this.buildUserQuery(dto).orderBy(
      `user.${dto.sort ?? 'createdAt'}`,
      dto.order ?? 'DESC',
    );
    const users = await qb.getMany();
    const { crypto, files } = await this.countsForUsers(users.map((u) => u.id));

    const header = [
      'id',
      'email',
      'auth',
      'verified',
      'status',
      'role',
      'wallets',
      'crypto_locks',
      'file_locks',
      'banned_at',
      'created_at',
    ];

    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      // Quoting RFC-4180 : on entoure de guillemets et on double les
      // guillemets internes si la valeur contient virgule, guillemet ou
      // saut de ligne.
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = users.map((u) => {
      const item = this.toListItem(u, crypto, files);
      return [
        item.id,
        item.email ?? '',
        item.loginMethod,
        item.isEmailVerified ? 'yes' : 'no',
        item.status,
        item.roleName ?? '',
        item.walletsCount,
        item.cryptoLocksCount,
        item.fileLocksCount,
        item.bannedAt ? new Date(item.bannedAt).toISOString() : '',
        new Date(item.createdAt).toISOString(),
      ]
        .map(escape)
        .join(',');
    });

    return [header.join(','), ...rows].join('\r\n');
  }

  /** Détails complets d'un utilisateur (rôle, wallets, locks crypto et fichiers). */
  async getUserDetails(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role', 'wallets'],
    });

    if (!user) {
      return null;
    }

    // Locks crypto de l'utilisateur (via la relation user → wallets → cryptoLocks).
    const cryptoLocks = await this.cryptoLocksRepository
      .createQueryBuilder('cl')
      .innerJoin('cl.wallet', 'w')
      .where('w.userId = :userId', { userId })
      .getMany();

    // Locks de fichier on-chain de l'utilisateur.
    const fileLocks = await this.blockchainFileLocksRepository.find({
      where: { userId },
    });

    return {
      ...user,
      cryptoLocks,
      fileLocks,
    };
  }

  /**
   * Indique au front quelle modale de re-authentification afficher avant
   * une action sensible : la méthode d'auth principale de l'admin
   * connecté (wallet vs mot de passe) + l'adresse du wallet externe avec
   * lequel signer (le cas échéant).
   */
  async getActingAdminAuthMethod(actingAdminId: number): Promise<{
    method: 'wallet' | 'password';
    walletAddress: string | null;
  }> {
    const admin = await this.usersRepository.findOne({
      where: { id: actingAdminId },
      relations: ['wallets'],
    });
    if (!admin) {
      throw new NotFoundException('Acting admin not found');
    }
    const isWalletAdmin = admin.email?.toLowerCase().endsWith('@timelock.local');
    if (isWalletAdmin) {
      const external = (admin.wallets ?? []).find((w) => w.type === 'external');
      return { method: 'wallet', walletAddress: external?.address ?? null };
    }
    return { method: 'password', walletAddress: null };
  }

  /**
   * Re-authentifie l'admin appelant avant d'appliquer une modification
   * sensible.
   *  - S'il s'est inscrit par wallet → on exige une signature fraîche
   *    de son wallet externe (anti-rejeu via timestamp dans le message).
   *  - Sinon → on exige son mot de passe de compte.
   *
   * Renvoie la méthode utilisée pour permettre aux appelants de
   * brancher leur logique si besoin.
   */
  async verifyAdminChallenge(
    actingAdminId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<'wallet' | 'password'> {
    const admin = await this.usersRepository.findOne({
      where: { id: actingAdminId },
      relations: ['wallets'],
    });
    if (!admin) {
      throw new UnauthorizedException('Acting admin not found');
    }

    const isWalletAdmin = admin.email?.toLowerCase().endsWith('@timelock.local');

    if (isWalletAdmin) {
      const { signature, message } = challenge;
      if (!signature || !message) {
        throw new UnauthorizedException('Signature required to confirm this action');
      }

      // Protection anti-rejeu : on rejette les messages sans timestamp
      // récent (fenêtre de 5 minutes).
      const tsMatch = message.match(/Timestamp:\s*(\d+)/);
      const ts = tsMatch ? parseInt(tsMatch[1], 10) : NaN;
      if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
        throw new UnauthorizedException('Signature expired — please retry');
      }

      let recovered: string;
      try {
        recovered = ethers.verifyMessage(message, signature).toLowerCase();
      } catch {
        throw new UnauthorizedException('Invalid signature');
      }

      const adminExternalAddresses = (admin.wallets ?? [])
        .filter((w) => w.type === 'external')
        .map((w) => w.address.toLowerCase());

      if (!adminExternalAddresses.includes(recovered)) {
        throw new UnauthorizedException(
          'Signature does not match any wallet linked to your admin account',
        );
      }
      return 'wallet';
    }

    // Admin email/mdp.
    const { password } = challenge;
    if (!password) {
      throw new UnauthorizedException('Password required to confirm this action');
    }
    // Vérif bcrypt-aware avec fallback plaintext legacy, comme le login.
    if (!(await verifyPassword(password, admin.passwordHash))) {
      throw new UnauthorizedException('Incorrect password');
    }
    return 'password';
  }

  /** Changement de rôle d'un utilisateur (admin → user, user → admin, etc.). */
  async setUserRole(
    userId: number,
    roleName: string,
    actingAdminId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<User> {
    // Ré-authentification de l'admin avant toute mutation.
    await this.verifyAdminChallenge(actingAdminId, challenge);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.rolesRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    user.roleId = role.id;
    const saved = await this.usersRepository.save(user);
    await this.auditService.log({
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: userId,
      userId: actingAdminId,
      metadata: { targetUserId: userId, newRole: roleName },
    });
    return saved;
  }

  /**
   * Modification d'email côté admin. Valide le format, contrôle
   * l'unicité parmi tous les utilisateurs, et force une re-vérification
   * (isEmailVerified=false) puisque l'admin n'a aucun moyen de prouver
   * qu'il possède la nouvelle boîte.
   */
  async setUserEmail(userId: number, rawEmail: string, actingAdminId?: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email cannot be empty');
    }
    // Vérif format façon RFC-5322 light — une regex stricte ne vaut pas
    // le coût de maintenance pour le gain réel.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (email === user.email?.toLowerCase()) {
      return user; // pas de changement → no-op.
    }

    const conflict = await this.usersRepository.findOne({
      where: { email, id: Not(userId) },
    });
    if (conflict) {
      throw new ConflictException('Another user already has this email');
    }

    const previous = user.email;
    user.email = email;
    user.isEmailVerified = false; // l'admin ne peut pas attester de la nouvelle boîte.
    const saved = await this.usersRepository.save(user);
    await this.auditService.log({
      action: AUDIT_ACTIONS.EMAIL_CHANGED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: userId,
      userId: actingAdminId ?? null,
      metadata: { targetUserId: userId, from: previous, to: email },
    });
    return saved;
  }

  /**
   * Réinitialisation côté admin du mot de passe d'un utilisateur.
   * Ré-authentifie d'abord l'admin, puis pose un nouveau mot de passe
   * hashé en bcrypt. Comptes email/mdp uniquement — les comptes wallet
   * s'authentifient par signature et n'ont pas de mot de passe.
   */
  async setUserPassword(
    targetUserId: number,
    rawNewPassword: string,
    actingAdminId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<{ success: true }> {
    await this.verifyAdminChallenge(actingAdminId, challenge);

    const user = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isWalletAccount = user.email?.toLowerCase().endsWith('@timelock.local');
    if (isWalletAccount) {
      throw new BadRequestException(
        "Ce compte se connecte par wallet — il n'a pas de mot de passe.",
      );
    }

    const newPassword = rawNewPassword ?? '';
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit faire au moins 8 caractères.',
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
    await this.auditService.log({
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      entityType: AUDIT_ENTITIES.USER,
      entityId: targetUserId,
      userId: actingAdminId,
      metadata: { targetUserId },
    });
    return { success: true };
  }

  async getRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  /**
   * Suppression définitive d'un compte (hard-delete).
   *
   * Les lignes liées (wallets, file_locks, blockchain_file_locks,
   * email_verifications) sont supprimées en cascade via les règles FK
   * de la base ; les `audit_logs` sont conservés avec leur `user_id`
   * mis à NULL (`ON DELETE SET NULL`) pour préserver la trace.
   *
   * Exige la ré-authentification de l'admin et refuse l'auto-suppression
   * (un admin ne peut pas se virer lui-même du panel par inadvertance).
   */
  async deleteUser(
    targetUserId: number,
    actingAdminId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<{ deleted: true }> {
    if (targetUserId === actingAdminId) {
      throw new BadRequestException(
        'Tu ne peux pas supprimer ton propre compte depuis ce panel.',
      );
    }

    await this.verifyAdminChallenge(actingAdminId, challenge);

    const user = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Journalisation AVANT la suppression (sinon on perd l'email associé).
    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_DELETED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: targetUserId,
      userId: actingAdminId,
      metadata: { targetUserId, email: user.email },
    });
    await this.usersRepository.delete({ id: targetUserId });
    return { deleted: true };
  }

  /**
   * Soft-delete : suspension d'un utilisateur. La ligne reste en base
   * (donc réactivable) mais le compte est refusé au login et à chaque
   * requête authentifiée (cf. `JwtStrategy.validate`).
   *
   * Exige la ré-authentification de l'admin, refuse l'auto-suspension
   * et protège les comptes `superadmin`.
   */
  async banUser(
    targetUserId: number,
    actingAdminId: number,
    reason: string | undefined,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<UserListItem> {
    if (targetUserId === actingAdminId) {
      throw new BadRequestException('Tu ne peux pas bannir ton propre compte.');
    }

    await this.verifyAdminChallenge(actingAdminId, challenge);

    const user = await this.usersRepository.findOne({
      where: { id: targetUserId },
      relations: ['role', 'wallets'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Protège les superadmins d'un bannissement depuis le panel.
    if (user.role?.name === 'superadmin') {
      throw new ForbiddenException('Un superadmin ne peut pas être banni.');
    }

    user.status = 'banned';
    user.bannedAt = new Date();
    user.bannedReason = (reason ?? '').trim().slice(0, 255) || null;
    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_BANNED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: targetUserId,
      userId: actingAdminId,
      metadata: { targetUserId, reason: user.bannedReason },
    });

    const { crypto, files } = await this.countsForUsers([saved.id]);
    return this.toListItem(saved, crypto, files);
  }

  /**
   * Réactive un utilisateur précédemment banni (statut → 'active').
   * Action de récupération, donc pas de challenge admin requis.
   */
  async restoreUser(targetUserId: number, actingAdminId?: number): Promise<UserListItem> {
    const user = await this.usersRepository.findOne({
      where: { id: targetUserId },
      relations: ['role', 'wallets'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = 'active';
    user.bannedAt = null;
    user.bannedReason = null;
    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_RESTORED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: targetUserId,
      userId: actingAdminId ?? null,
      metadata: { targetUserId },
    });

    const { crypto, files } = await this.countsForUsers([saved.id]);
    return this.toListItem(saved, crypto, files);
  }
}

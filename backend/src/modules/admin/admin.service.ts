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

export interface PaginatedUsers {
  items: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

  async getStats(): Promise<AdminStats> {
    // Users stats
    // Wallet-login users have auto-generated emails ending in @timelock.local
    // (created during the wallet-signup flow). We detect them by suffix rather
    // than relying on the `loginMethod` column, which was inconsistent in
    // older signups.
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

    // New users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneWeekAgo })
      .getCount();

    // New users this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newThisMonth = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneMonthAgo })
      .getCount();

    // Crypto locks stats
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

    // Blockchain file locks stats
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

    // Total size of blockchain files
    const sizeResult = await this.blockchainFileLocksRepository
      .createQueryBuilder('file')
      .select('COALESCE(SUM(file.sizeBytes), 0)', 'totalSize')
      .getRawOne();
    const totalSizeBytes = parseInt(sizeResult?.totalSize || '0', 10);

    // Classic file locks stats
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

    // Wallets stats
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
   * Build a User query with all the list filters (search / role / status /
   * auth method / verification) applied. Shared by the paginated listing and
   * the CSV export so both honour the exact same criteria.
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
      // Wallet accounts carry the @timelock.local suffix (see getStats).
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

  /** Resolve crypto-lock and file-lock counts for a set of user ids. */
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

  private toListItem(
    user: User,
    crypto: Map<number, number>,
    files: Map<number, number>,
  ): UserListItem {
    return {
      id: user.id,
      email: user.email,
      // Same heuristic as getStats: trust the @timelock.local suffix over the
      // stored loginMethod column, which has historical inconsistencies.
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
   * Advanced, paginated user listing: search + multi-filter + whitelisted sort.
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
   * Export the filtered user set as CSV (no pagination — every matching row).
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
      // RFC-4180 quoting: wrap in quotes and double any embedded quotes when the
      // value contains a comma, quote or newline.
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

  async getUserDetails(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role', 'wallets'],
    });

    if (!user) {
      return null;
    }

    // Get user's crypto locks
    const cryptoLocks = await this.cryptoLocksRepository
      .createQueryBuilder('cl')
      .innerJoin('cl.wallet', 'w')
      .where('w.userId = :userId', { userId })
      .getMany();

    // Get user's file locks
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
   * Tell the frontend which challenge to display before sensitive actions:
   * the acting admin's primary auth method (wallet vs password) + the
   * external wallet address to sign with (if applicable).
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
   * Re-authenticate the calling admin before applying a sensitive change.
   * If they signed up by wallet → require a fresh signature with that wallet.
   * Otherwise → require their account password.
   * Returns the admin's auth method so callers can branch on it if needed.
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

      // Replay protection: reject messages without a recent timestamp.
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

    // Password admin
    const { password } = challenge;
    if (!password) {
      throw new UnauthorizedException('Password required to confirm this action');
    }
    // bcrypt-aware (with legacy plaintext fallback), mirroring the login path.
    if (!(await verifyPassword(password, admin.passwordHash))) {
      throw new UnauthorizedException('Incorrect password');
    }
    return 'password';
  }

  async setUserRole(
    userId: number,
    roleName: string,
    actingAdminId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<User> {
    // Re-authenticate the admin doing the change before mutating anything.
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
   * Admin-level email change. Validates format, enforces uniqueness across
   * users, and forces a re-verification (isEmailVerified=false) because the
   * admin has no way to prove ownership of the new mailbox.
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
    // Loose RFC-5322-ish check — strict regex isn't worth the maintenance cost.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (email === user.email?.toLowerCase()) {
      return user; // no-op
    }

    const conflict = await this.usersRepository.findOne({
      where: { email, id: Not(userId) },
    });
    if (conflict) {
      throw new ConflictException('Another user already has this email');
    }

    const previous = user.email;
    user.email = email;
    user.isEmailVerified = false; // admin cannot vouch for ownership
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
   * Admin reset of a user's password. Re-authenticates the acting admin, then
   * sets a fresh bcrypt-hashed password. Email/password accounts only — wallet
   * accounts authenticate by signature and have no password.
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
   * Hard-delete a user account. All FK-linked rows (wallets, file locks,
   * blockchain file locks, email verifications) cascade by DB-level rules;
   * audit logs are kept with their user_id nulled.
   *
   * Requires re-authentication via challenge. Refuses self-delete to avoid
   * an admin accidentally locking themselves out of the panel.
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
   * Soft-delete: ban a user. The row stays (so it can be restored) but the
   * account is refused at login and on every authenticated request. Requires
   * re-authentication via challenge and refuses self-ban.
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
    // Protect superadmins from being banned through the panel.
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
   * Restore a previously banned user back to 'active'. Recovery action — does
   * not require the admin challenge.
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

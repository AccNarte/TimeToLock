import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';
import { BlockchainFileLock } from '../timelock-files-blockchain/blockchain-file-lock.entity';
import { FileLock } from '../timelock-files/file-lock.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Role } from '../roles/role.entity';

export interface AdminStats {
  users: {
    total: number;
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
  roleName: string | null;
  walletsCount: number;
  cryptoLocksCount: number;
  fileLocksCount: number;
  createdAt: Date;
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
    const totalUsers = await this.usersRepository.count();
    const passwordAuthUsers = await this.usersRepository.count({
      where: { loginMethod: 'password' },
    });
    const walletAuthUsers = await this.usersRepository.count({
      where: { loginMethod: 'wallet' },
    });
    const verifiedEmailUsers = await this.usersRepository.count({
      where: { isEmailVerified: true },
    });

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

  async getUsers(): Promise<UserListItem[]> {
    const users = await this.usersRepository.find({
      relations: ['role', 'wallets'],
      order: { createdAt: 'DESC' },
    });

    // Get crypto locks count per wallet
    const cryptoLocksPerUser = await this.cryptoLocksRepository
      .createQueryBuilder('cl')
      .select('w.userId', 'userId')
      .addSelect('COUNT(cl.id)', 'count')
      .innerJoin('cl.wallet', 'w')
      .groupBy('w.userId')
      .getRawMany();

    const cryptoLocksMap = new Map<number, number>();
    cryptoLocksPerUser.forEach((item) => {
      cryptoLocksMap.set(parseInt(item.userId), parseInt(item.count));
    });

    // Get file locks count per user
    const fileLocksPerUser = await this.blockchainFileLocksRepository
      .createQueryBuilder('fl')
      .select('fl.userId', 'userId')
      .addSelect('COUNT(fl.id)', 'count')
      .groupBy('fl.userId')
      .getRawMany();

    const fileLocksMap = new Map<number, number>();
    fileLocksPerUser.forEach((item) => {
      fileLocksMap.set(parseInt(item.userId), parseInt(item.count));
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      loginMethod: user.loginMethod,
      isEmailVerified: user.isEmailVerified,
      roleName: user.role?.name || null,
      walletsCount: user.wallets?.length || 0,
      cryptoLocksCount: cryptoLocksMap.get(user.id) || 0,
      fileLocksCount: fileLocksMap.get(user.id) || 0,
      createdAt: user.createdAt,
    }));
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

  async setUserRole(userId: number, roleName: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.rolesRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new Error('Role not found');
    }

    user.roleId = role.id;
    return this.usersRepository.save(user);
  }

  async getRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }
}

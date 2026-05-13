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
export declare class AdminService {
    private usersRepository;
    private cryptoLocksRepository;
    private blockchainFileLocksRepository;
    private fileLocksRepository;
    private walletsRepository;
    private rolesRepository;
    constructor(usersRepository: Repository<User>, cryptoLocksRepository: Repository<CryptoLock>, blockchainFileLocksRepository: Repository<BlockchainFileLock>, fileLocksRepository: Repository<FileLock>, walletsRepository: Repository<Wallet>, rolesRepository: Repository<Role>);
    checkAdminAccess(userId: number): Promise<boolean>;
    getStats(): Promise<AdminStats>;
    getUsers(): Promise<UserListItem[]>;
    getUserDetails(userId: number): Promise<{
        cryptoLocks: CryptoLock[];
        fileLocks: BlockchainFileLock[];
        id: number;
        email: string;
        passwordHash: string;
        isEmailVerified: boolean;
        loginMethod: string;
        roleId: number;
        createdAt: Date;
        updatedAt: Date;
        wallets: Wallet[];
        auditLogs: import("../audit/audit.entity").AuditLog[];
        role: Role;
    }>;
    setUserRole(userId: number, roleName: string): Promise<User>;
    getRoles(): Promise<Role[]>;
}

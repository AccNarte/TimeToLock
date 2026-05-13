import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    private ensureAdmin;
    getStats(userId: number): Promise<import("./admin.service").AdminStats>;
    getUsers(userId: number): Promise<import("./admin.service").UserListItem[]>;
    getUserDetails(userId: number, targetUserId: number): Promise<{
        cryptoLocks: import("../timelock-crypto/crypto-lock.entity").CryptoLock[];
        fileLocks: import("../timelock-files-blockchain").BlockchainFileLock[];
        id: number;
        email: string;
        passwordHash: string;
        isEmailVerified: boolean;
        loginMethod: string;
        roleId: number;
        createdAt: Date;
        updatedAt: Date;
        wallets: import("../wallets/wallet.entity").Wallet[];
        auditLogs: import("../audit/audit.entity").AuditLog[];
        role: import("../roles/role.entity").Role;
    }>;
    setUserRole(userId: number, targetUserId: number, roleName: string): Promise<import("../users/user.entity").User>;
    getRoles(userId: number): Promise<import("../roles/role.entity").Role[]>;
    checkAccess(userId: number): Promise<{
        isAdmin: boolean;
    }>;
}

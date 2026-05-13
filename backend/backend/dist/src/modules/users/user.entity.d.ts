import { Wallet } from '../wallets/wallet.entity';
import { FileLock } from '../timelock-files/file-lock.entity';
import { AuditLog } from '../audit/audit.entity';
import { Role } from '../roles/role.entity';
export declare class User {
    id: number;
    email: string;
    passwordHash: string;
    isEmailVerified: boolean;
    loginMethod: string;
    roleId: number;
    createdAt: Date;
    updatedAt: Date;
    wallets: Wallet[];
    fileLocks: FileLock[];
    auditLogs: AuditLog[];
    role: Role;
}

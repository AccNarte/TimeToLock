import { AuditLog } from './audit.entity';
export declare class Action {
    id: number;
    name: string;
    description: string;
    auditLogs: AuditLog[];
}

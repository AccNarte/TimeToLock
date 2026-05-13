import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
export declare class AuditService {
    private auditLogRepository;
    constructor(auditLogRepository: Repository<AuditLog>);
    log(data: {
        userId?: number;
        userWalletId?: number;
        entityTypeId: number;
        entityId: number;
        actionId: number;
        metadataJson?: object;
    }): Promise<AuditLog>;
    findAllByUser(userId: number): Promise<AuditLog[]>;
}

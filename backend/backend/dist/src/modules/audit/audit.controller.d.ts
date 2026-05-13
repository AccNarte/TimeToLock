import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(userId: number): Promise<import("./audit.entity").AuditLog[]>;
}

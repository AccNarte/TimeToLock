import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: {
    userId?: number;
    userWalletId?: number;
    entityTypeId: number; // Reference to entity_types table
    entityId: number;
    actionId: number; // Reference to actions table
    metadataJson?: object;
  }): Promise<AuditLog> {
    // Stub: Create audit log entry
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async findAllByUser(userId: number): Promise<AuditLog[]> {
    // Stub: Get all audit logs for user
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}



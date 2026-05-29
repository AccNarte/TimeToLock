import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { AuditLog } from './audit.entity';

@Entity('entity_types')
export class EntityType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string; // 'USER', 'WALLET', 'FILE_LOCK', 'CRYPTO_LOCK', etc.

  @OneToMany(() => AuditLog, (auditLog) => auditLog.entityType)
  auditLogs: AuditLog[];
}










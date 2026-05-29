import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { AuditLog } from './audit.entity';

@Entity('actions')
export class Action {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => AuditLog, (auditLog) => auditLog.action)
  auditLogs: AuditLog[];
}










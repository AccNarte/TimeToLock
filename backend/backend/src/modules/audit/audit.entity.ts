import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Wallet } from '../wallets/wallet.entity';
import { EntityType } from './entity-type.entity';
import { Action } from './action.entity';

@Entity('audit_logs')
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_wallet', ['userWalletId'])
@Index('idx_audit_entity', ['entityTypeId', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'integer', nullable: true, name: 'user_wallet_id' })
  userWalletId: number;

  @Column({ type: 'integer', name: 'entity_type_id' })
  entityTypeId: number;

  @Column({ type: 'integer' })
  entityId: number;

  @Column({ type: 'integer', name: 'action_id' })
  actionId: number;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata_json' })
  metadataJson: object;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Wallet, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => EntityType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entity_type_id' })
  entityType: EntityType;

  @ManyToOne(() => Action, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'action_id' })
  action: Action;
}



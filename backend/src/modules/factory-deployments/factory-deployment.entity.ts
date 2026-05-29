import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Recorded deployment of an on-chain factory contract.
 * Keyed by (chainId, contractType) — only one entry per pair is `isActive: true`.
 * Older deployments stay in the table as history.
 */
@Entity('factory_deployments')
@Index(['chainId', 'contractType', 'isActive'])
export class FactoryDeployment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  // 'crypto_timelock' | 'file_lock' — leaves room for future factory types.
  @Column({
    name: 'contract_type',
    type: 'varchar',
    length: 50,
    default: 'crypto_timelock',
  })
  contractType: string;

  @Column({ type: 'varchar', length: 66 })
  address: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @Column({ name: 'deployed_by_user_id', type: 'integer', nullable: true })
  deployedByUserId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

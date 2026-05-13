import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { TokenContract } from '../tokens/token-contract.entity';

@Entity('crypto_networks')
export class CryptoNetwork {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId: number;

  @OneToMany(() => TokenContract, (tokenContract) => tokenContract.network)
  tokenContracts: TokenContract[];
}










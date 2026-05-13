import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { TokenContract } from './token-contract.entity';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'integer' })
  decimals: number;

  @OneToMany(() => TokenContract, (tokenContract) => tokenContract.token)
  tokenContracts: TokenContract[];
}










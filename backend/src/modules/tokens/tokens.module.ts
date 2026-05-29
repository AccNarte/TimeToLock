import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './token.entity';
import { TokenContract } from './token-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Token, TokenContract])],
  exports: [TypeOrmModule],
})
export class TokensModule {}










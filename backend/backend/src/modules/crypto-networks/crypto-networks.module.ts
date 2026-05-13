import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoNetwork } from './crypto-network.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CryptoNetwork])],
  exports: [TypeOrmModule],
})
export class CryptoNetworksModule {}










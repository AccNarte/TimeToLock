import { Module } from '@nestjs/common';
import { CryptoEngineService } from './crypto-engine.service';

@Module({
  providers: [CryptoEngineService],
  exports: [CryptoEngineService],
})
export class CryptoEngineModule {}



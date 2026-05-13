import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TimelockFilesModule } from './modules/timelock-files/timelock-files.module';
import { TimelockCryptoModule } from './modules/timelock-crypto/timelock-crypto.module';
import { AuditModule } from './modules/audit/audit.module';
import { CryptoEngineModule } from './modules/crypto-engine/crypto-engine.module';
import { RolesModule } from './modules/roles/roles.module';
import { CryptoNetworksModule } from './modules/crypto-networks/crypto-networks.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { IpfsModule } from './modules/ipfs/ipfs.module';
import { TimelockFilesBlockchainModule } from './modules/timelock-files-blockchain/timelock-files-blockchain.module';
import { AdminModule } from './modules/admin/admin.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import securityConfig from './config/security.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, securityConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        
        if (databaseUrl) {
          // Use connection string (NeonDB)
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: process.env.NODE_ENV !== 'production',
            ssl: { rejectUnauthorized: false },
          };
        }
        
        // Fallback to individual parameters
        return {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    TimelockFilesModule,
    TimelockCryptoModule,
    AuditModule,
    CryptoEngineModule,
    RolesModule,
    CryptoNetworksModule,
    TokensModule,
    IpfsModule,
    TimelockFilesBlockchainModule,
    AdminModule,
  ],
})
export class AppModule {}



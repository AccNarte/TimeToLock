"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const wallets_module_1 = require("./modules/wallets/wallets.module");
const timelock_files_module_1 = require("./modules/timelock-files/timelock-files.module");
const timelock_crypto_module_1 = require("./modules/timelock-crypto/timelock-crypto.module");
const audit_module_1 = require("./modules/audit/audit.module");
const crypto_engine_module_1 = require("./modules/crypto-engine/crypto-engine.module");
const roles_module_1 = require("./modules/roles/roles.module");
const crypto_networks_module_1 = require("./modules/crypto-networks/crypto-networks.module");
const tokens_module_1 = require("./modules/tokens/tokens.module");
const ipfs_module_1 = require("./modules/ipfs/ipfs.module");
const timelock_files_blockchain_module_1 = require("./modules/timelock-files-blockchain/timelock-files-blockchain.module");
const admin_module_1 = require("./modules/admin/admin.module");
const database_config_1 = require("./config/database.config");
const jwt_config_1 = require("./config/jwt.config");
const security_config_1 = require("./config/security.config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [database_config_1.default, jwt_config_1.default, security_config_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 3,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 20,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const databaseUrl = process.env.DATABASE_URL;
                    if (databaseUrl) {
                        return {
                            type: 'postgres',
                            url: databaseUrl,
                            autoLoadEntities: true,
                            synchronize: process.env.NODE_ENV !== 'production',
                            ssl: { rejectUnauthorized: false },
                        };
                    }
                    return {
                        type: 'postgres',
                        host: configService.get('database.host'),
                        port: configService.get('database.port'),
                        username: configService.get('database.username'),
                        password: configService.get('database.password'),
                        database: configService.get('database.database'),
                        autoLoadEntities: true,
                        synchronize: process.env.NODE_ENV !== 'production',
                        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
                    };
                },
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            wallets_module_1.WalletsModule,
            timelock_files_module_1.TimelockFilesModule,
            timelock_crypto_module_1.TimelockCryptoModule,
            audit_module_1.AuditModule,
            crypto_engine_module_1.CryptoEngineModule,
            roles_module_1.RolesModule,
            crypto_networks_module_1.CryptoNetworksModule,
            tokens_module_1.TokensModule,
            ipfs_module_1.IpfsModule,
            timelock_files_blockchain_module_1.TimelockFilesBlockchainModule,
            admin_module_1.AdminModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
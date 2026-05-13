"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockCryptoModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const timelock_crypto_controller_1 = require("./timelock-crypto.controller");
const timelock_crypto_service_1 = require("./timelock-crypto.service");
const crypto_lock_entity_1 = require("./crypto-lock.entity");
const token_contract_entity_1 = require("../tokens/token-contract.entity");
const blockchain_module_1 = require("../blockchain/blockchain.module");
let TimelockCryptoModule = class TimelockCryptoModule {
};
exports.TimelockCryptoModule = TimelockCryptoModule;
exports.TimelockCryptoModule = TimelockCryptoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([crypto_lock_entity_1.CryptoLock, token_contract_entity_1.TokenContract]),
            blockchain_module_1.BlockchainModule,
        ],
        controllers: [timelock_crypto_controller_1.TimelockCryptoController],
        providers: [timelock_crypto_service_1.TimelockCryptoService],
        exports: [timelock_crypto_service_1.TimelockCryptoService],
    })
], TimelockCryptoModule);
//# sourceMappingURL=timelock-crypto.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenContract = void 0;
const typeorm_1 = require("typeorm");
const token_entity_1 = require("./token.entity");
const crypto_network_entity_1 = require("../crypto-networks/crypto-network.entity");
const crypto_lock_entity_1 = require("../timelock-crypto/crypto-lock.entity");
let TokenContract = class TokenContract {
};
exports.TokenContract = TokenContract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TokenContract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'token_id' }),
    __metadata("design:type", Number)
], TokenContract.prototype, "tokenId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'network_id' }),
    __metadata("design:type", Number)
], TokenContract.prototype, "networkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'contract_address' }),
    __metadata("design:type", String)
], TokenContract.prototype, "contractAddress", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => token_entity_1.Token, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'token_id' }),
    __metadata("design:type", token_entity_1.Token)
], TokenContract.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => crypto_network_entity_1.CryptoNetwork, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'network_id' }),
    __metadata("design:type", crypto_network_entity_1.CryptoNetwork)
], TokenContract.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => crypto_lock_entity_1.CryptoLock, (cryptoLock) => cryptoLock.tokenContract),
    __metadata("design:type", Array)
], TokenContract.prototype, "cryptoLocks", void 0);
exports.TokenContract = TokenContract = __decorate([
    (0, typeorm_1.Entity)('token_contracts'),
    (0, typeorm_1.Index)('idx_token_contracts_token', ['tokenId']),
    (0, typeorm_1.Index)('idx_token_contracts_network', ['networkId']),
    (0, typeorm_1.Unique)(['tokenId', 'networkId'])
], TokenContract);
//# sourceMappingURL=token-contract.entity.js.map
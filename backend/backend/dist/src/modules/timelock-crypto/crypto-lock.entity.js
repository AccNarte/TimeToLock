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
exports.CryptoLock = void 0;
const typeorm_1 = require("typeorm");
const wallet_entity_1 = require("../wallets/wallet.entity");
const token_contract_entity_1 = require("../tokens/token-contract.entity");
let CryptoLock = class CryptoLock {
};
exports.CryptoLock = CryptoLock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CryptoLock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'user_wallet_id' }),
    __metadata("design:type", Number)
], CryptoLock.prototype, "userWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'token_contract_id' }),
    __metadata("design:type", Number)
], CryptoLock.prototype, "tokenContractId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 78, scale: 0, name: 'amount_wei' }),
    __metadata("design:type", String)
], CryptoLock.prototype, "amountWei", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'unlock_at' }),
    __metadata("design:type", Date)
], CryptoLock.prototype, "unlockAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'locked_tx_hash' }),
    __metadata("design:type", String)
], CryptoLock.prototype, "lockedTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'lock_contract_address' }),
    __metadata("design:type", String)
], CryptoLock.prototype, "lockContractAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'withdraw_tx_hash' }),
    __metadata("design:type", String)
], CryptoLock.prototype, "withdrawTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'LOCKED' }),
    __metadata("design:type", String)
], CryptoLock.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' }),
    __metadata("design:type", Date)
], CryptoLock.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp', default: () => 'NOW()', name: 'updated_at' }),
    __metadata("design:type", Date)
], CryptoLock.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wallet_entity_1.Wallet, (wallet) => wallet.cryptoLocks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_wallet_id' }),
    __metadata("design:type", wallet_entity_1.Wallet)
], CryptoLock.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => token_contract_entity_1.TokenContract, (tokenContract) => tokenContract.cryptoLocks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'token_contract_id' }),
    __metadata("design:type", token_contract_entity_1.TokenContract)
], CryptoLock.prototype, "tokenContract", void 0);
exports.CryptoLock = CryptoLock = __decorate([
    (0, typeorm_1.Entity)('crypto_locks'),
    (0, typeorm_1.Index)('idx_cryptolocks_wallet', ['userWalletId']),
    (0, typeorm_1.Index)('idx_cryptolocks_token', ['tokenContractId'])
], CryptoLock);
//# sourceMappingURL=crypto-lock.entity.js.map
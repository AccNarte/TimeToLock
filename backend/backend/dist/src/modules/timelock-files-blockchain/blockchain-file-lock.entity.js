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
exports.BlockchainFileLock = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const wallet_entity_1 = require("../wallets/wallet.entity");
let BlockchainFileLock = class BlockchainFileLock {
};
exports.BlockchainFileLock = BlockchainFileLock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BlockchainFileLock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'user_id' }),
    __metadata("design:type", Number)
], BlockchainFileLock.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'wallet_id' }),
    __metadata("design:type", Number)
], BlockchainFileLock.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'mime_type', default: 'application/octet-stream' }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'size_bytes' }),
    __metadata("design:type", Number)
], BlockchainFileLock.prototype, "sizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'ipfs_hash' }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "ipfsHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'locked_tx_hash' }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "lockedTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'lock_contract_address' }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "lockContractAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'chain_id' }),
    __metadata("design:type", Number)
], BlockchainFileLock.prototype, "chainId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'unlock_at' }),
    __metadata("design:type", Date)
], BlockchainFileLock.prototype, "unlockAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'unlocked_at' }),
    __metadata("design:type", Date)
], BlockchainFileLock.prototype, "unlockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'LOCKED' }),
    __metadata("design:type", String)
], BlockchainFileLock.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp', name: 'created_at' }),
    __metadata("design:type", Date)
], BlockchainFileLock.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp', name: 'updated_at' }),
    __metadata("design:type", Date)
], BlockchainFileLock.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], BlockchainFileLock.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wallet_entity_1.Wallet, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'wallet_id' }),
    __metadata("design:type", wallet_entity_1.Wallet)
], BlockchainFileLock.prototype, "wallet", void 0);
exports.BlockchainFileLock = BlockchainFileLock = __decorate([
    (0, typeorm_1.Entity)('blockchain_file_locks'),
    (0, typeorm_1.Index)('idx_blockchain_filelocks_user', ['userId']),
    (0, typeorm_1.Index)('idx_blockchain_filelocks_wallet', ['walletId']),
    (0, typeorm_1.Index)('idx_blockchain_filelocks_contract', ['lockContractAddress']),
    (0, typeorm_1.Index)('idx_blockchain_filelocks_ipfs', ['ipfsHash'])
], BlockchainFileLock);
//# sourceMappingURL=blockchain-file-lock.entity.js.map
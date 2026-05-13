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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ethers_1 = require("ethers");
const wallet_entity_1 = require("./wallet.entity");
const encryption_service_1 = require("../../common/services/encryption.service");
const users_service_1 = require("../users/users.service");
let WalletsService = class WalletsService {
    constructor(walletsRepository, encryptionService, usersService) {
        this.walletsRepository = walletsRepository;
        this.encryptionService = encryptionService;
        this.usersService = usersService;
    }
    async createInternal(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const wallet = ethers_1.ethers.Wallet.createRandom();
        const mnemonic = wallet.mnemonic?.phrase || '';
        const privateKey = wallet.privateKey;
        const address = wallet.address.toLowerCase();
        const encryptionPassword = this.encryptionService.generateEncryptionPassword(userId, user.email || `user_${userId}`);
        const encryptedPrivateKey = this.encryptionService.encrypt(privateKey, encryptionPassword);
        const encryptedMnemonic = this.encryptionService.encrypt(mnemonic, encryptionPassword);
        const privateKeyData = `${encryptedPrivateKey.encrypted}:${encryptedPrivateKey.salt}:${encryptedPrivateKey.iv}:${encryptedPrivateKey.tag}`;
        const mnemonicData = `${encryptedMnemonic.encrypted}:${encryptedMnemonic.salt}:${encryptedMnemonic.iv}:${encryptedMnemonic.tag}`;
        const walletEntity = this.walletsRepository.create({
            userId,
            type: 'internal',
            address,
            provider: dto.provider || 'ethers',
            encryptedPrivateKey: privateKeyData,
            encryptedMnemonic: mnemonicData,
            salt: encryptedPrivateKey.salt,
        });
        const savedWallet = await this.walletsRepository.save(walletEntity);
        return {
            wallet: savedWallet,
            mnemonic,
        };
    }
    async linkExternal(userId, dto) {
        const wallet = this.walletsRepository.create({
            userId,
            type: 'external',
            address: dto.address,
            provider: dto.provider,
        });
        return this.walletsRepository.save(wallet);
    }
    async findAllByUser(userId) {
        return this.walletsRepository.find({ where: { userId } });
    }
    async findById(id) {
        return this.walletsRepository.findOne({ where: { id } });
    }
    async findByAddress(address) {
        return this.walletsRepository.findOne({
            where: { address: address.toLowerCase() },
        });
    }
    async createEmbedded(userId, dto) {
        const existing = await this.findByAddress(dto.address);
        if (existing) {
            throw new common_1.ConflictException('Un wallet avec cette adresse existe déjà');
        }
        const walletEntity = this.walletsRepository.create({
            userId,
            type: 'internal',
            address: dto.address.toLowerCase(),
            provider: 'embedded',
            encryptedPrivateKey: dto.encryptedPrivateKey,
            encryptedMnemonic: dto.encryptedMnemonic,
            salt: dto.salt,
        });
        return this.walletsRepository.save(walletEntity);
    }
    async getEmbeddedWalletData(userId, walletId) {
        const wallet = await this.walletsRepository.findOne({
            where: { id: walletId, userId, type: 'internal' },
        });
        if (!wallet || !wallet.encryptedPrivateKey) {
            return null;
        }
        return {
            encryptedPrivateKey: wallet.encryptedPrivateKey,
            encryptedMnemonic: wallet.encryptedMnemonic || '',
            salt: wallet.salt || '',
        };
    }
    async hasEmbeddedWallet(userId) {
        const count = await this.walletsRepository.count({
            where: { userId, type: 'internal' },
        });
        return count > 0;
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        encryption_service_1.EncryptionService,
        users_service_1.UsersService])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map
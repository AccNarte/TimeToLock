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
var TimelockCryptoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockCryptoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_lock_entity_1 = require("./crypto-lock.entity");
const timelock_contract_service_1 = require("../blockchain/services/timelock-contract.service");
let TimelockCryptoService = TimelockCryptoService_1 = class TimelockCryptoService {
    constructor(cryptoLockRepository, timelockContractService) {
        this.cryptoLockRepository = cryptoLockRepository;
        this.timelockContractService = timelockContractService;
        this.logger = new common_1.Logger(TimelockCryptoService_1.name);
    }
    async create(dto) {
        const cryptoLock = this.cryptoLockRepository.create({
            userWalletId: dto.walletId,
            tokenContractId: dto.tokenContractId,
            amountWei: dto.amountWei,
            unlockAt: new Date(dto.unlockAt),
            status: 'LOCKED',
        });
        return this.cryptoLockRepository.save(cryptoLock);
    }
    async saveLockFromFrontend(dto) {
        this.logger.log(`Saving lock from frontend: ${dto.lockContractAddress}`);
        const cryptoLock = this.cryptoLockRepository.create({
            userWalletId: dto.walletId,
            tokenContractId: dto.tokenContractId,
            amountWei: dto.amountWei,
            unlockAt: new Date(dto.unlockAt),
            lockedTxHash: dto.txHash,
            lockContractAddress: dto.lockContractAddress,
            status: 'LOCKED',
        });
        return this.cryptoLockRepository.save(cryptoLock);
    }
    async findAllByWallet(walletId) {
        return this.cryptoLockRepository.find({ where: { userWalletId: walletId } });
    }
    async findById(id) {
        return this.cryptoLockRepository.findOne({ where: { id } });
    }
    async findAllByUser(userId) {
        const locks = await this.cryptoLockRepository.find({
            relations: ['wallet', 'tokenContract', 'tokenContract.network', 'tokenContract.token'],
            where: { wallet: { userId } },
        });
        const transformedLocks = [];
        for (const lock of locks) {
            if (lock.lockContractAddress && lock.tokenContract?.network) {
                try {
                    const onChainStatus = await this.timelockContractService.getLockStatus(lock.lockContractAddress, lock.tokenContract.network.chainId);
                    if (lock.status !== onChainStatus.status) {
                        lock.status = onChainStatus.status;
                        await this.cryptoLockRepository.save(lock);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to sync status for lock ${lock.id}: ${error.message}`);
                }
            }
            const decimals = lock.tokenContract?.token?.decimals || 18;
            const amountFormatted = (parseFloat(lock.amountWei) / Math.pow(10, decimals)).toString();
            transformedLocks.push({
                id: lock.id.toString(),
                userWalletId: lock.userWalletId.toString(),
                tokenSymbol: lock.tokenContract?.token?.symbol || 'UNKNOWN',
                tokenDecimals: decimals,
                chainName: lock.tokenContract?.network?.name || 'Unknown',
                chainId: lock.tokenContract?.network?.chainId,
                tokenAddress: lock.tokenContract?.contractAddress,
                lockContractAddress: lock.lockContractAddress,
                amountWei: lock.amountWei,
                amountFormatted,
                unlockAt: lock.unlockAt.toISOString(),
                lockedTxHash: lock.lockedTxHash,
                withdrawTxHash: lock.withdrawTxHash,
                status: lock.status.toLowerCase(),
                createdAt: lock.createdAt.toISOString(),
                updatedAt: lock.updatedAt.toISOString(),
            });
        }
        return transformedLocks;
    }
    async syncLockStatus(lockId, chainId) {
        const lock = await this.findById(lockId);
        if (!lock || !lock.lockContractAddress) {
            throw new Error('Lock not found or no contract address');
        }
        const onChainStatus = await this.timelockContractService.getLockStatus(lock.lockContractAddress, chainId);
        lock.status = onChainStatus.status;
        return this.cryptoLockRepository.save(lock);
    }
    async markAsWithdrawn(lockId, txHash, userId) {
        const lock = await this.cryptoLockRepository.findOne({
            where: { id: lockId },
            relations: ['wallet'],
        });
        if (!lock) {
            throw new common_1.NotFoundException(`Lock ${lockId} not found`);
        }
        if (lock.wallet?.userId !== userId) {
            throw new common_1.ForbiddenException('You do not own this lock');
        }
        lock.status = 'WITHDRAWN';
        lock.withdrawTxHash = txHash;
        this.logger.log(`Marking lock ${lockId} as withdrawn. TX: ${txHash}`);
        return this.cryptoLockRepository.save(lock);
    }
};
exports.TimelockCryptoService = TimelockCryptoService;
exports.TimelockCryptoService = TimelockCryptoService = TimelockCryptoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(crypto_lock_entity_1.CryptoLock)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        timelock_contract_service_1.TimelockContractService])
], TimelockCryptoService);
//# sourceMappingURL=timelock-crypto.service.js.map
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
var TimelockFilesBlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockFilesBlockchainService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const blockchain_file_lock_entity_1 = require("./blockchain-file-lock.entity");
const ipfs_service_1 = require("../ipfs/ipfs.service");
let TimelockFilesBlockchainService = TimelockFilesBlockchainService_1 = class TimelockFilesBlockchainService {
    constructor(fileLockRepository, ipfsService) {
        this.fileLockRepository = fileLockRepository;
        this.ipfsService = ipfsService;
        this.logger = new common_1.Logger(TimelockFilesBlockchainService_1.name);
    }
    async create(userId, dto) {
        this.logger.log(`Creating blockchain file lock for user ${userId}`);
        const fileLock = this.fileLockRepository.create({
            userId,
            walletId: dto.walletId,
            title: dto.title || dto.filename,
            filename: dto.filename,
            mimeType: dto.mimeType || 'application/octet-stream',
            sizeBytes: dto.sizeBytes,
            ipfsHash: dto.ipfsHash,
            lockedTxHash: dto.txHash,
            lockContractAddress: dto.lockContractAddress,
            chainId: dto.chainId,
            unlockAt: new Date(dto.unlockAt),
            status: 'LOCKED',
        });
        const saved = await this.fileLockRepository.save(fileLock);
        this.logger.log(`Created blockchain file lock ${saved.id} for user ${userId}`);
        return saved;
    }
    async findAllByUser(userId) {
        const locks = await this.fileLockRepository.find({
            where: { userId },
            relations: ['wallet'],
            order: { createdAt: 'DESC' },
        });
        const now = new Date();
        for (const lock of locks) {
            if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
                lock.status = 'UNLOCKABLE';
                await this.fileLockRepository.save(lock);
            }
        }
        return locks;
    }
    async findById(id, userId) {
        const lock = await this.fileLockRepository.findOne({
            where: { id, userId },
            relations: ['wallet'],
        });
        if (lock) {
            const now = new Date();
            if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
                lock.status = 'UNLOCKABLE';
                await this.fileLockRepository.save(lock);
            }
        }
        return lock;
    }
    async getIpfsUrl(id, userId) {
        const lock = await this.findById(id, userId);
        if (!lock) {
            throw new common_1.NotFoundException('File lock not found');
        }
        const now = new Date();
        if (lock.unlockAt > now) {
            throw new common_1.ForbiddenException('File is still locked');
        }
        return this.ipfsService.getGatewayUrl(lock.ipfsHash);
    }
    async markAsUnlocked(id, userId) {
        const lock = await this.findById(id, userId);
        if (!lock) {
            throw new common_1.NotFoundException('File lock not found');
        }
        lock.status = 'UNLOCKED';
        lock.unlockedAt = new Date();
        const saved = await this.fileLockRepository.save(lock);
        this.logger.log(`Marked file lock ${id} as unlocked for user ${userId}`);
        return saved;
    }
    async syncStatus(id, userId) {
        const lock = await this.fileLockRepository.findOne({
            where: { id, userId },
        });
        if (!lock) {
            throw new common_1.NotFoundException('Lock not found');
        }
        const now = new Date();
        let newStatus = lock.status;
        if (lock.status === 'LOCKED' && lock.unlockAt <= now) {
            newStatus = 'UNLOCKABLE';
        }
        if (newStatus !== lock.status) {
            lock.status = newStatus;
            await this.fileLockRepository.save(lock);
            this.logger.log(`Synced file lock ${id} status to ${newStatus}`);
        }
        return lock;
    }
    async getUserStats(userId) {
        const locks = await this.fileLockRepository.find({
            where: { userId },
        });
        const now = new Date();
        let locked = 0;
        let unlockable = 0;
        let unlocked = 0;
        let totalSizeBytes = 0;
        for (const lock of locks) {
            totalSizeBytes += Number(lock.sizeBytes);
            if (lock.status === 'UNLOCKED') {
                unlocked++;
            }
            else if (lock.unlockAt <= now) {
                unlockable++;
            }
            else {
                locked++;
            }
        }
        return {
            total: locks.length,
            locked,
            unlockable,
            unlocked,
            totalSizeBytes,
        };
    }
    async delete(id, userId) {
        const lock = await this.findById(id, userId);
        if (!lock) {
            throw new common_1.NotFoundException('File lock not found');
        }
        await this.fileLockRepository.delete({ id, userId });
        this.logger.log(`Deleted file lock ${id} for user ${userId}`);
    }
};
exports.TimelockFilesBlockchainService = TimelockFilesBlockchainService;
exports.TimelockFilesBlockchainService = TimelockFilesBlockchainService = TimelockFilesBlockchainService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(blockchain_file_lock_entity_1.BlockchainFileLock)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ipfs_service_1.IpfsService])
], TimelockFilesBlockchainService);
//# sourceMappingURL=timelock-files-blockchain.service.js.map
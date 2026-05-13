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
exports.TimelockFilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const file_lock_entity_1 = require("./file-lock.entity");
const file_entity_1 = require("../files/file.entity");
let TimelockFilesService = class TimelockFilesService {
    constructor(fileLockRepository, fileRepository) {
        this.fileLockRepository = fileLockRepository;
        this.fileRepository = fileRepository;
    }
    async create(userId, dto) {
        const file = this.fileRepository.create({
            filename: dto.filename,
            mimeType: dto.mimeType || 'application/octet-stream',
            sizeBytes: dto.sizeBytes,
        });
        const savedFile = await this.fileRepository.save(file);
        const fileLock = this.fileLockRepository.create({
            userId,
            fileId: savedFile.id,
            title: dto.title || dto.filename,
            ciphertext: dto.ciphertext,
            iv: dto.iv,
            salt: dto.salt,
            authTag: dto.authTag,
            hashChecksum: dto.hashChecksum,
            unlockAt: new Date(dto.unlockAt),
            status: 'LOCKED',
        });
        return this.fileLockRepository.save(fileLock);
    }
    async findAllByUser(userId) {
        const files = await this.fileLockRepository.find({
            where: { userId },
            relations: ['file'],
            order: { createdAt: 'DESC' },
        });
        const now = new Date();
        for (const fileLock of files) {
            const shouldBeUnlockable = fileLock.unlockAt <= now && fileLock.status === 'LOCKED';
            if (shouldBeUnlockable) {
                fileLock.status = 'UNLOCKABLE';
                await this.fileLockRepository.save(fileLock);
            }
        }
        return files;
    }
    async findById(id, userId) {
        const fileLock = await this.fileLockRepository.findOne({
            where: { id, userId },
            relations: ['file'],
        });
        if (fileLock) {
            const now = new Date();
            if (fileLock.unlockAt <= now && fileLock.status === 'LOCKED') {
                fileLock.status = 'UNLOCKABLE';
                await this.fileLockRepository.save(fileLock);
            }
        }
        return fileLock;
    }
    async getEncryptedFileData(id, userId) {
        const fileLock = await this.findById(id, userId);
        if (!fileLock) {
            throw new common_1.NotFoundException('File lock not found');
        }
        const now = new Date();
        if (fileLock.unlockAt > now) {
            throw new common_1.ForbiddenException('File is still locked');
        }
        return {
            ciphertext: fileLock.ciphertext,
            iv: fileLock.iv,
            salt: fileLock.salt,
            authTag: fileLock.authTag,
            hashChecksum: fileLock.hashChecksum,
            filename: fileLock.file?.filename || 'file',
            mimeType: fileLock.file?.mimeType || 'application/octet-stream',
        };
    }
    async markAsUnlocked(id, userId) {
        const fileLock = await this.findById(id, userId);
        if (!fileLock) {
            throw new common_1.NotFoundException('File lock not found');
        }
        fileLock.status = 'UNLOCKED';
        fileLock.unlockedAt = new Date();
        return this.fileLockRepository.save(fileLock);
    }
};
exports.TimelockFilesService = TimelockFilesService;
exports.TimelockFilesService = TimelockFilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(file_lock_entity_1.FileLock)),
    __param(1, (0, typeorm_1.InjectRepository)(file_entity_1.File)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TimelockFilesService);
//# sourceMappingURL=timelock-files.service.js.map
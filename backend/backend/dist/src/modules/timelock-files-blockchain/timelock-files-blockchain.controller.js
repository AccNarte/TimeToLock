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
exports.TimelockFilesBlockchainController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const timelock_files_blockchain_service_1 = require("./timelock-files-blockchain.service");
const dto_1 = require("./dto");
let TimelockFilesBlockchainController = class TimelockFilesBlockchainController {
    constructor(timelockFilesBlockchainService) {
        this.timelockFilesBlockchainService = timelockFilesBlockchainService;
    }
    async create(userId, dto) {
        return this.timelockFilesBlockchainService.create(userId, dto);
    }
    async findAll(userId) {
        return this.timelockFilesBlockchainService.findAllByUser(userId);
    }
    async getStats(userId) {
        return this.timelockFilesBlockchainService.getUserStats(userId);
    }
    async findOne(userId, id) {
        return this.timelockFilesBlockchainService.findById(id, userId);
    }
    async getIpfsUrl(userId, id) {
        const url = await this.timelockFilesBlockchainService.getIpfsUrl(id, userId);
        return { url };
    }
    async markAsUnlocked(userId, id) {
        return this.timelockFilesBlockchainService.markAsUnlocked(id, userId);
    }
    async syncStatus(userId, id, dto) {
        return this.timelockFilesBlockchainService.syncStatus(id, userId);
    }
    async delete(userId, id) {
        await this.timelockFilesBlockchainService.delete(id, userId);
    }
};
exports.TimelockFilesBlockchainController = TimelockFilesBlockchainController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dto_1.CreateBlockchainFileLockDto]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/ipfs-url'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "getIpfsUrl", null);
__decorate([
    (0, common_1.Post)(':id/unlock'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "markAsUnlocked", null);
__decorate([
    (0, common_1.Post)(':id/sync'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, dto_1.SyncStatusDto]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "syncStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesBlockchainController.prototype, "delete", null);
exports.TimelockFilesBlockchainController = TimelockFilesBlockchainController = __decorate([
    (0, common_1.Controller)('timelock-files-blockchain'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [timelock_files_blockchain_service_1.TimelockFilesBlockchainService])
], TimelockFilesBlockchainController);
//# sourceMappingURL=timelock-files-blockchain.controller.js.map
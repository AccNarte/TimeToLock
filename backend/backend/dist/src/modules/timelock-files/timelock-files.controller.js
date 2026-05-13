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
exports.TimelockFilesController = void 0;
const common_1 = require("@nestjs/common");
const timelock_files_service_1 = require("./timelock-files.service");
const create_file_lock_dto_1 = require("./dto/create-file-lock.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
let TimelockFilesController = class TimelockFilesController {
    constructor(timelockFilesService) {
        this.timelockFilesService = timelockFilesService;
    }
    async create(userId, dto) {
        return this.timelockFilesService.create(userId, dto);
    }
    async findAll(userId) {
        return this.timelockFilesService.findAllByUser(userId);
    }
    async findOne(userId, id) {
        return this.timelockFilesService.findById(parseInt(id, 10), userId);
    }
    async getEncryptedData(userId, id) {
        return this.timelockFilesService.getEncryptedFileData(parseInt(id, 10), userId);
    }
    async markUnlocked(userId, id) {
        return this.timelockFilesService.markAsUnlocked(parseInt(id, 10), userId);
    }
};
exports.TimelockFilesController = TimelockFilesController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_file_lock_dto_1.CreateFileLockDto]),
    __metadata("design:returntype", Promise)
], TimelockFilesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TimelockFilesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], TimelockFilesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/decrypt'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], TimelockFilesController.prototype, "getEncryptedData", null);
__decorate([
    (0, common_1.Post)(':id/unlock'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], TimelockFilesController.prototype, "markUnlocked", null);
exports.TimelockFilesController = TimelockFilesController = __decorate([
    (0, common_1.Controller)('timelock-files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [timelock_files_service_1.TimelockFilesService])
], TimelockFilesController);
//# sourceMappingURL=timelock-files.controller.js.map
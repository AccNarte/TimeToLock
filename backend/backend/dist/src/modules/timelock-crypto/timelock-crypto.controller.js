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
exports.TimelockCryptoController = void 0;
const common_1 = require("@nestjs/common");
const timelock_crypto_service_1 = require("./timelock-crypto.service");
const create_crypto_lock_dto_1 = require("./dto/create-crypto-lock.dto");
const save_lock_from_frontend_dto_1 = require("./dto/save-lock-from-frontend.dto");
const mark_withdrawn_dto_1 = require("./dto/mark-withdrawn.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
let TimelockCryptoController = class TimelockCryptoController {
    constructor(timelockCryptoService) {
        this.timelockCryptoService = timelockCryptoService;
    }
    async lock(dto) {
        return this.timelockCryptoService.create(dto);
    }
    async saveLockFromFrontend(dto) {
        return this.timelockCryptoService.saveLockFromFrontend(dto);
    }
    async findAll(userId) {
        return this.timelockCryptoService.findAllByUser(userId);
    }
    async findOne(id) {
        return this.timelockCryptoService.findById(parseInt(id, 10));
    }
    async syncStatus(id, chainId) {
        return this.timelockCryptoService.syncLockStatus(parseInt(id, 10), chainId);
    }
    async markWithdrawn(id, dto, userId) {
        return this.timelockCryptoService.markAsWithdrawn(parseInt(id, 10), dto.txHash, userId);
    }
};
exports.TimelockCryptoController = TimelockCryptoController;
__decorate([
    (0, common_1.Post)('lock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_crypto_lock_dto_1.CreateCryptoLockDto]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "lock", null);
__decorate([
    (0, common_1.Post)('save-from-frontend'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_lock_from_frontend_dto_1.SaveLockFromFrontendDto]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "saveLockFromFrontend", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/sync'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('chainId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "syncStatus", null);
__decorate([
    (0, common_1.Post)(':id/withdraw'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mark_withdrawn_dto_1.MarkWithdrawnDto, Number]),
    __metadata("design:returntype", Promise)
], TimelockCryptoController.prototype, "markWithdrawn", null);
exports.TimelockCryptoController = TimelockCryptoController = __decorate([
    (0, common_1.Controller)('timelock-crypto'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [timelock_crypto_service_1.TimelockCryptoService])
], TimelockCryptoController);
//# sourceMappingURL=timelock-crypto.controller.js.map
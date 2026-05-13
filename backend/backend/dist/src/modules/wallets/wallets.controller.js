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
exports.WalletsController = void 0;
const common_1 = require("@nestjs/common");
const wallets_service_1 = require("./wallets.service");
const create_internal_wallet_dto_1 = require("./dto/create-internal-wallet.dto");
const link_external_wallet_dto_1 = require("./dto/link-external-wallet.dto");
const create_embedded_wallet_dto_1 = require("./dto/create-embedded-wallet.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
let WalletsController = class WalletsController {
    constructor(walletsService) {
        this.walletsService = walletsService;
    }
    async createInternal(userId, dto) {
        const { wallet, mnemonic } = await this.walletsService.createInternal(userId, dto);
        return {
            wallet: {
                id: wallet.id,
                userId: wallet.userId,
                type: wallet.type,
                address: wallet.address,
                provider: wallet.provider,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            },
            mnemonic,
            message: 'Wallet créé avec succès. Veuillez sauvegarder votre phrase de récupération (mnemonic) dans un endroit sûr. Elle ne sera plus affichée.',
        };
    }
    async linkExternal(userId, dto) {
        return this.walletsService.linkExternal(userId, dto);
    }
    async findAll(userId) {
        return this.walletsService.findAllByUser(userId);
    }
    async createEmbedded(userId, dto) {
        try {
            const wallet = await this.walletsService.createEmbedded(userId, dto);
            return {
                wallet: {
                    id: wallet.id,
                    userId: wallet.userId,
                    type: wallet.type,
                    address: wallet.address,
                    provider: wallet.provider,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt,
                },
                message: 'Wallet embarqué créé avec succès',
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getEncryptedData(userId, walletId) {
        const data = await this.walletsService.getEmbeddedWalletData(userId, walletId);
        if (!data) {
            throw new common_1.NotFoundException('Wallet non trouvé ou pas un wallet embarqué');
        }
        return data;
    }
    async hasEmbedded(userId) {
        const hasEmbedded = await this.walletsService.hasEmbeddedWallet(userId);
        return { hasEmbedded };
    }
};
exports.WalletsController = WalletsController;
__decorate([
    (0, common_1.Post)('create-internal'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_internal_wallet_dto_1.CreateInternalWalletDto]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "createInternal", null);
__decorate([
    (0, common_1.Post)('link-external'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, link_external_wallet_dto_1.LinkExternalWalletDto]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "linkExternal", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('create-embedded'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_embedded_wallet_dto_1.CreateEmbeddedWalletDto]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "createEmbedded", null);
__decorate([
    (0, common_1.Get)(':id/encrypted-data'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "getEncryptedData", null);
__decorate([
    (0, common_1.Get)('has-embedded'),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "hasEmbedded", null);
exports.WalletsController = WalletsController = __decorate([
    (0, common_1.Controller)('wallets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wallets_service_1.WalletsService])
], WalletsController);
//# sourceMappingURL=wallets.controller.js.map
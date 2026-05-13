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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const wallets_service_1 = require("../wallets/wallets.service");
const ethers_1 = require("ethers");
let AuthService = class AuthService {
    constructor(usersService, walletsService, jwtService) {
        this.usersService = usersService;
        this.walletsService = walletsService;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const user = await this.usersService.create(registerDto);
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email },
        };
    }
    async login(loginDto) {
        const user = await this.usersService.validateUser(loginDto.email, loginDto.password);
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email },
        };
    }
    async getProfile(userId) {
        return this.usersService.findById(userId);
    }
    async walletLogin(walletLoginDto) {
        const { address, signature, message } = walletLoginDto;
        try {
            const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
            const normalizedAddress = address.toLowerCase();
            const normalizedRecovered = recoveredAddress.toLowerCase();
            if (normalizedAddress !== normalizedRecovered) {
                throw new common_1.UnauthorizedException('Invalid signature');
            }
            const existingWallet = await this.walletsService.findByAddress(normalizedAddress);
            let user = null;
            if (existingWallet) {
                user = await this.usersService.findById(existingWallet.userId);
                if (!user) {
                    throw new common_1.UnauthorizedException('User not found for wallet');
                }
            }
            else {
                user = await this.usersService.create({
                    email: `wallet_${normalizedAddress}@timelock.local`,
                    password: '',
                });
                await this.walletsService.linkExternal(user.id, {
                    address: normalizedAddress,
                    provider: 'metamask',
                });
            }
            const payload = { sub: user.id, email: user.email };
            return {
                access_token: this.jwtService.sign(payload),
                user: { id: user.id, email: user.email },
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid wallet authentication');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        wallets_service_1.WalletsService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
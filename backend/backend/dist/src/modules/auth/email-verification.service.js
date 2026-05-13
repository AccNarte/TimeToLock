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
var EmailVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const email_verification_entity_1 = require("./entities/email-verification.entity");
const user_entity_1 = require("../users/user.entity");
const email_service_1 = require("../email/email.service");
let EmailVerificationService = EmailVerificationService_1 = class EmailVerificationService {
    constructor(emailVerificationRepository, userRepository, emailService, configService) {
        this.emailVerificationRepository = emailVerificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.configService = configService;
        this.logger = new common_1.Logger(EmailVerificationService_1.name);
        this.tokenExpirationHours = 24;
    }
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    async sendVerificationEmail(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.isEmailVerified) {
            return { sent: false, message: 'Email already verified' };
        }
        await this.emailVerificationRepository.update({ userId, isUsed: false }, { isUsed: true });
        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + this.tokenExpirationHours);
        const verification = this.emailVerificationRepository.create({
            userId,
            token,
            expiresAt,
            isUsed: false,
        });
        await this.emailVerificationRepository.save(verification);
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
        const emailSent = await this.emailService.sendVerificationEmail(user.email, token, frontendUrl);
        if (emailSent) {
            this.logger.log(`Verification email sent to ${user.email}`);
            return { sent: true, message: 'Verification email sent' };
        }
        else {
            if (process.env.NODE_ENV !== 'production') {
                this.logger.warn(`Email not configured. Verification token for ${user.email}: ${token}`);
                return {
                    sent: false,
                    message: 'Email service not configured. Check server logs for verification token.',
                };
            }
            return { sent: false, message: 'Failed to send verification email' };
        }
    }
    async verifyEmail(token) {
        const verification = await this.emailVerificationRepository.findOne({
            where: {
                token,
                isUsed: false,
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
            relations: ['user'],
        });
        if (!verification) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        verification.isUsed = true;
        await this.emailVerificationRepository.save(verification);
        await this.userRepository.update(verification.userId, {
            isEmailVerified: true,
        });
        this.logger.log(`Email verified for user ${verification.userId}`);
        return { success: true, message: 'Email verified successfully' };
    }
    async isEmailVerified(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        return user?.isEmailVerified ?? false;
    }
};
exports.EmailVerificationService = EmailVerificationService;
exports.EmailVerificationService = EmailVerificationService = EmailVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(email_verification_entity_1.EmailVerification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        email_service_1.EmailService,
        config_1.ConfigService])
], EmailVerificationService);
//# sourceMappingURL=email-verification.service.js.map
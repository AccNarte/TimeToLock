import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailVerification } from './entities/email-verification.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
export declare class EmailVerificationService {
    private emailVerificationRepository;
    private userRepository;
    private readonly emailService;
    private readonly configService;
    private readonly logger;
    private readonly tokenExpirationHours;
    constructor(emailVerificationRepository: Repository<EmailVerification>, userRepository: Repository<User>, emailService: EmailService, configService: ConfigService);
    private generateToken;
    sendVerificationEmail(userId: number): Promise<{
        sent: boolean;
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    isEmailVerified(userId: number): Promise<boolean>;
}

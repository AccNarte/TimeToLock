import { Response } from 'express';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
export declare class AuthController {
    private readonly authService;
    private readonly emailVerificationService;
    constructor(authService: AuthService, emailVerificationService: EmailVerificationService);
    register(registerDto: RegisterDto, res: Response): Promise<{
        user: {
            id: number;
            email: string;
        };
    }>;
    login(loginDto: LoginDto, res: Response): Promise<{
        user: {
            id: number;
            email: string;
        };
    }>;
    walletLogin(walletLoginDto: WalletLoginDto, res: Response): Promise<{
        user: {
            id: any;
            email: any;
        };
    }>;
    logout(res: Response): Promise<{
        message: string;
    }>;
    getProfile(userId: number): Promise<import("../users/user.entity").User>;
    sendVerificationEmail(userId: number): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        success: {
            success: boolean;
            message: string;
        };
        message: string;
    }>;
    getVerificationStatus(userId: number): Promise<{
        isVerified: boolean;
        email: string;
    }>;
}

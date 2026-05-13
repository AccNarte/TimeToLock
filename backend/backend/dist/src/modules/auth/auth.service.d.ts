import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
export declare class AuthService {
    private usersService;
    private walletsService;
    private jwtService;
    constructor(usersService: UsersService, walletsService: WalletsService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
        };
    }>;
    getProfile(userId: number): Promise<import("../users/user.entity").User>;
    walletLogin(walletLoginDto: WalletLoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
        };
    }>;
}

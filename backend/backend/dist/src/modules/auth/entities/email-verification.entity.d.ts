import { User } from '../../users/user.entity';
export declare class EmailVerification {
    id: number;
    userId: number;
    user: User;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    createdAt: Date;
}

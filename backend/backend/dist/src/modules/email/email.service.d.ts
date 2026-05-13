import { ConfigService } from '@nestjs/config';
export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    sendEmail(options: SendEmailOptions): Promise<boolean>;
    sendVerificationEmail(email: string, verificationToken: string, frontendUrl: string): Promise<boolean>;
    isEmailConfigured(): boolean;
}

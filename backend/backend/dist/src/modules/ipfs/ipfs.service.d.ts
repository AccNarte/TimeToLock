import { ConfigService } from '@nestjs/config';
export interface IpfsUploadResult {
    ipfsHash: string;
    pinSize: number;
    timestamp: string;
}
export declare class IpfsService {
    private readonly configService;
    private readonly logger;
    private readonly pinataApiKey;
    private readonly pinataSecretKey;
    private readonly pinataGateway;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    isIpfsConfigured(): boolean;
    uploadFile(fileBuffer: Buffer, filename: string, metadata?: Record<string, string>): Promise<IpfsUploadResult>;
    uploadJson(jsonData: Record<string, any>, name: string): Promise<IpfsUploadResult>;
    getFile(ipfsHash: string): Promise<Buffer>;
    getGatewayUrl(ipfsHash: string): string;
    getIpfsUrl(ipfsHash: string): string;
    unpinFile(ipfsHash: string): Promise<boolean>;
    isPinned(ipfsHash: string): Promise<boolean>;
}

import { EncryptRequestDto } from './dto/encrypt-request.dto';
import { DecryptRequestDto } from './dto/decrypt-request.dto';
export declare class CryptoEngineService {
    encrypt(dto: EncryptRequestDto): Promise<{
        ciphertext: string;
        iv: string;
        authTag: string;
    }>;
    decrypt(dto: DecryptRequestDto): Promise<{
        data: string;
    }>;
}

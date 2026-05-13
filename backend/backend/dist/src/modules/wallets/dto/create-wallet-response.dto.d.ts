export declare class CreateWalletResponseDto {
    wallet: {
        id: number;
        userId: number;
        type: string;
        address: string;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
    };
    mnemonic: string;
    message: string;
}

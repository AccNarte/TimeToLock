export declare class CreateBlockchainFileLockDto {
    title?: string;
    filename: string;
    mimeType?: string;
    sizeBytes: number;
    ipfsHash: string;
    txHash: string;
    lockContractAddress: string;
    walletId: number;
    chainId: number;
    unlockAt: string;
}

import { ethers } from 'ethers';
export declare class Web3Service {
    private readonly logger;
    private providers;
    getProvider(chainId: number): ethers.JsonRpcProvider;
    getWalletSigner(privateKey: string, chainId: number): ethers.Wallet;
    estimateGas(transaction: ethers.TransactionRequest, chainId: number): Promise<bigint>;
    getGasPrice(chainId: number): Promise<bigint>;
    waitForTransaction(txHash: string, chainId: number, confirmations?: number): Promise<ethers.TransactionReceipt | null>;
    getTransactionReceipt(txHash: string, chainId: number): Promise<ethers.TransactionReceipt | null>;
    getBlockNumber(chainId: number): Promise<number>;
    getBalance(address: string, chainId: number): Promise<bigint>;
    isContract(address: string, chainId: number): Promise<boolean>;
}

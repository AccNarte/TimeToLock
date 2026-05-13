import { ethers } from 'ethers';
import { Web3Service } from './web3.service';
export declare class ContractService {
    private readonly web3Service;
    private readonly logger;
    private abis;
    constructor(web3Service: Web3Service);
    private loadAbis;
    getAbi(contractName: string): any[];
    getTimelockFactory(chainId: number, signer?: ethers.Signer): ethers.Contract;
    getTimelockVault(vaultAddress: string, chainId: number, signer?: ethers.Signer): ethers.Contract;
    getERC20Contract(tokenAddress: string, chainId: number, signer?: ethers.Signer): ethers.Contract;
    getFactoryAddress(chainId: number): string;
    parseEventLogs(receipt: ethers.TransactionReceipt, contractInterface: ethers.Interface, eventName: string): ethers.LogDescription[];
}

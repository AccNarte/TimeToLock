import { TokenContract } from '../tokens/token-contract.entity';
export declare class CryptoNetwork {
    id: number;
    name: string;
    chainId: number;
    tokenContracts: TokenContract[];
}

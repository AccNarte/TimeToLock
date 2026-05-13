import { TokenContract } from './token-contract.entity';
export declare class Token {
    id: number;
    symbol: string;
    decimals: number;
    tokenContracts: TokenContract[];
}

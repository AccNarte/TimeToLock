import { Token } from './token.entity';
import { CryptoNetwork } from '../crypto-networks/crypto-network.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';
export declare class TokenContract {
    id: number;
    tokenId: number;
    networkId: number;
    contractAddress: string;
    token: Token;
    network: CryptoNetwork;
    cryptoLocks: CryptoLock[];
}

import { Wallet } from '../wallet.entity';

export class CreateWalletResponseDto {
  wallet: {
    id: number;
    userId: number;
    type: string;
    address: string;
    provider: string;
    createdAt: Date;
    updatedAt: Date;
  };
  mnemonic: string; // Only returned once when wallet is created
  message: string;
}








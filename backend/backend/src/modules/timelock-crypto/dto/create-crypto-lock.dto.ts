import { IsString, IsDateString, IsNumber } from 'class-validator';

export class CreateCryptoLockDto {
  @IsNumber()
  walletId: number;

  @IsNumber()
  tokenContractId: number; // Reference to token_contracts table

  @IsString()
  amountWei: string;

  @IsDateString()
  unlockAt: string;
}



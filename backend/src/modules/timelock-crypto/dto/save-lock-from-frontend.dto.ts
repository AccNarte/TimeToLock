import { IsString, IsNotEmpty, IsDateString, IsNumber } from 'class-validator';

export class SaveLockFromFrontendDto {
  @IsNumber()
  @IsNotEmpty()
  walletId: number;

  @IsNumber()
  @IsNotEmpty()
  tokenContractId: number;

  @IsString()
  @IsNotEmpty()
  amountWei: string;

  @IsDateString()
  @IsNotEmpty()
  unlockAt: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsString()
  @IsNotEmpty()
  lockContractAddress: string;

  @IsNumber()
  @IsNotEmpty()
  chainId: number;
}

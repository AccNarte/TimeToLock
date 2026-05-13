import { IsString, IsNumber, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBlockchainFileLockDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsNumber()
  sizeBytes: number;

  @IsString()
  @IsNotEmpty()
  ipfsHash: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsString()
  @IsNotEmpty()
  lockContractAddress: string;

  @IsNumber()
  walletId: number;

  @IsNumber()
  chainId: number;

  @IsDateString()
  @IsNotEmpty()
  unlockAt: string;
}

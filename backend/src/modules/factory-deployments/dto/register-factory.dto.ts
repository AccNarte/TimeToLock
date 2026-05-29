import { IsEthereumAddress, IsIn, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterFactoryDto {
  @IsInt()
  chainId: number;

  @IsOptional()
  @IsIn(['crypto_timelock', 'file_lock'])
  contractType?: 'crypto_timelock' | 'file_lock';

  @IsEthereumAddress()
  address: string;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/)
  txHash?: string;
}

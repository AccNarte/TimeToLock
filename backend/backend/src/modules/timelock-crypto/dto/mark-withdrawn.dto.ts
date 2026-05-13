import { IsString, IsNumber } from 'class-validator';

export class MarkWithdrawnDto {
  @IsString()
  txHash: string;

  @IsNumber()
  chainId: number;
}

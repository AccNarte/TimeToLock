import { IsNumber } from 'class-validator';

export class SyncStatusDto {
  @IsNumber()
  chainId: number;
}

import { IsOptional, IsString } from 'class-validator';

export class CreateInternalWalletDto {
  @IsOptional()
  @IsString()
  provider?: string;
}



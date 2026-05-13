import { IsString, IsOptional } from 'class-validator';

export class LinkExternalWalletDto {
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  provider?: string;
}



import { IsString } from 'class-validator';

export class EncryptRequestDto {
  @IsString()
  data: string;

  @IsString()
  key: string;
}



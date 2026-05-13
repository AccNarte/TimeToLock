import { IsString } from 'class-validator';

export class DecryptRequestDto {
  @IsString()
  ciphertext: string;

  @IsString()
  key: string;

  @IsString()
  iv: string;

  @IsString()
  authTag: string;
}



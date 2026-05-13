import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateFileLockDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  @IsString()
  ciphertext: string;

  @IsString()
  iv: string;

  @IsString()
  salt: string;

  @IsString()
  authTag: string;

  @IsOptional()
  @IsString()
  hashChecksum?: string;

  @IsDateString()
  unlockAt: string;
}



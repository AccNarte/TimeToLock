import { IsString, IsNotEmpty } from 'class-validator';

export class CreateEmbeddedWalletDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  encryptedPrivateKey: string; // Already encrypted client-side

  @IsString()
  @IsNotEmpty()
  encryptedMnemonic: string; // Already encrypted client-side

  @IsString()
  @IsNotEmpty()
  salt: string; // Salt used for encryption
}

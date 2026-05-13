import { Controller, Post, Get, Body, UseGuards, Param, ParseIntPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateInternalWalletDto } from './dto/create-internal-wallet.dto';
import { LinkExternalWalletDto } from './dto/link-external-wallet.dto';
import { CreateEmbeddedWalletDto } from './dto/create-embedded-wallet.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('create-internal')
  async createInternal(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateInternalWalletDto,
  ) {
    const { wallet, mnemonic } = await this.walletsService.createInternal(userId, dto);
    
    // Return wallet without sensitive data, but include mnemonic for one-time display
    return {
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        type: wallet.type,
        address: wallet.address,
        provider: wallet.provider,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      mnemonic, // ⚠️ IMPORTANT: This should be shown only once to the user
      message: 'Wallet créé avec succès. Veuillez sauvegarder votre phrase de récupération (mnemonic) dans un endroit sûr. Elle ne sera plus affichée.',
    };
  }

  @Post('link-external')
  async linkExternal(
    @CurrentUser('id') userId: number,
    @Body() dto: LinkExternalWalletDto,
  ) {
    return this.walletsService.linkExternal(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.walletsService.findAllByUser(userId);
  }

  /**
   * Create an embedded wallet with client-side encrypted data
   * True self-custody: backend never sees the plaintext private key
   */
  @Post('create-embedded')
  async createEmbedded(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateEmbeddedWalletDto,
  ) {
    try {
      const wallet = await this.walletsService.createEmbedded(userId, dto);
      return {
        wallet: {
          id: wallet.id,
          userId: wallet.userId,
          type: wallet.type,
          address: wallet.address,
          provider: wallet.provider,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        },
        message: 'Wallet embarqué créé avec succès',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get encrypted wallet data for client-side decryption
   */
  @Get(':id/encrypted-data')
  async getEncryptedData(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) walletId: number,
  ) {
    const data = await this.walletsService.getEmbeddedWalletData(userId, walletId);
    if (!data) {
      throw new NotFoundException('Wallet non trouvé ou pas un wallet embarqué');
    }
    return data;
  }

  /**
   * Check if user has an embedded wallet
   */
  @Get('has-embedded')
  async hasEmbedded(@CurrentUser('id') userId: number) {
    const hasEmbedded = await this.walletsService.hasEmbeddedWallet(userId);
    return { hasEmbedded };
  }
}



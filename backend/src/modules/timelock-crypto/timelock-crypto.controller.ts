import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TimelockCryptoService } from './timelock-crypto.service';
import { CreateCryptoLockDto } from './dto/create-crypto-lock.dto';
import { SaveLockFromFrontendDto } from './dto/save-lock-from-frontend.dto';
import { MarkWithdrawnDto } from './dto/mark-withdrawn.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('timelock-crypto')
@UseGuards(JwtAuthGuard)
export class TimelockCryptoController {
  constructor(private readonly timelockCryptoService: TimelockCryptoService) {}

  @Post('lock')
  async lock(@Body() dto: CreateCryptoLockDto) {
    return this.timelockCryptoService.create(dto);
  }

  /**
   * Save a lock created from frontend (user signed the transaction)
   */
  @Post('save-from-frontend')
  async saveLockFromFrontend(
    @Body() dto: SaveLockFromFrontendDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.timelockCryptoService.saveLockFromFrontend(dto, userId);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.timelockCryptoService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.timelockCryptoService.findById(parseInt(id, 10));
  }

  /**
   * Sync lock status from blockchain
   */
  @Post(':id/sync')
  async syncStatus(@Param('id') id: string, @Body('chainId') chainId: number) {
    return this.timelockCryptoService.syncLockStatus(parseInt(id, 10), chainId);
  }

  /**
   * Mark lock as withdrawn after successful blockchain transaction
   */
  @Post(':id/withdraw')
  async markWithdrawn(
    @Param('id') id: string,
    @Body() dto: MarkWithdrawnDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.timelockCryptoService.markAsWithdrawn(
      parseInt(id, 10),
      dto.txHash,
      userId,
    );
  }
}

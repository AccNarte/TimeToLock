import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TimelockFilesService } from './timelock-files.service';
import { CreateFileLockDto } from './dto/create-file-lock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('timelock-files')
@UseGuards(JwtAuthGuard)
export class TimelockFilesController {
  constructor(private readonly timelockFilesService: TimelockFilesService) {}

  @Post('create')
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateFileLockDto,
  ) {
    return this.timelockFilesService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.timelockFilesService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id') id: string,
  ) {
    return this.timelockFilesService.findById(parseInt(id, 10), userId);
  }

  /**
   * Get encrypted file data for decryption
   * Only returns data if file is unlockable or already unlocked
   */
  @Get(':id/decrypt')
  async getEncryptedData(
    @CurrentUser('id') userId: number,
    @Param('id') id: string,
  ) {
    return this.timelockFilesService.getEncryptedFileData(parseInt(id, 10), userId);
  }

  /**
   * Mark file as unlocked after successful client-side decryption
   */
  @Post(':id/unlock')
  async markUnlocked(
    @CurrentUser('id') userId: number,
    @Param('id') id: string,
  ) {
    return this.timelockFilesService.markAsUnlocked(parseInt(id, 10), userId);
  }
}



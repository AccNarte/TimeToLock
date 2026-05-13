import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { TimelockFilesBlockchainService } from './timelock-files-blockchain.service';
import { CreateBlockchainFileLockDto, SyncStatusDto } from './dto';

@Controller('timelock-files-blockchain')
@UseGuards(JwtAuthGuard)
export class TimelockFilesBlockchainController {
  constructor(
    private readonly timelockFilesBlockchainService: TimelockFilesBlockchainService,
  ) {}

  /**
   * Create a new blockchain file lock record
   * Called after the frontend has created the lock on blockchain and uploaded to IPFS
   */
  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateBlockchainFileLockDto,
  ) {
    return this.timelockFilesBlockchainService.create(userId, dto);
  }

  /**
   * Get all blockchain file locks for the current user
   */
  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.timelockFilesBlockchainService.findAllByUser(userId);
  }

  /**
   * Get statistics for the current user's file locks
   */
  @Get('stats')
  async getStats(@CurrentUser('id') userId: number) {
    return this.timelockFilesBlockchainService.getUserStats(userId);
  }

  /**
   * Get a specific blockchain file lock by ID
   */
  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.timelockFilesBlockchainService.findById(id, userId);
  }

  /**
   * Get the IPFS gateway URL for downloading the encrypted file
   * Only returns if the file is unlockable (unlock time has passed)
   */
  @Get(':id/ipfs-url')
  async getIpfsUrl(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const url = await this.timelockFilesBlockchainService.getIpfsUrl(id, userId);
    return { url };
  }

  /**
   * Mark a file lock as unlocked
   * Called after the user has successfully retrieved the key from the blockchain
   */
  @Post(':id/unlock')
  async markAsUnlocked(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.timelockFilesBlockchainService.markAsUnlocked(id, userId);
  }

  /**
   * Sync the status of a file lock based on blockchain time
   */
  @Post(':id/sync')
  async syncStatus(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncStatusDto,
  ) {
    return this.timelockFilesBlockchainService.syncStatus(id, userId);
  }

  /**
   * Delete a file lock record
   * Note: This does NOT unpin from IPFS or affect the blockchain contract
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.timelockFilesBlockchainService.delete(id, userId);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FactoryDeploymentsService, ContractType } from './factory-deployments.service';
import { RegisterFactoryDto } from './dto/register-factory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AdminService } from '../admin/admin.service';

@Controller('factory')
export class FactoryDeploymentsController {
  constructor(
    private readonly service: FactoryDeploymentsService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * Public read: anyone (logged in or not) can fetch the current factory.
   * The address is public on-chain data anyway, and the frontend needs it on
   * cold start before auth.
   */
  @Get('current')
  getCurrent(
    @Query('chainId') chainIdParam: string,
    @Query('contractType') contractType?: ContractType,
  ) {
    const chainId = parseInt(chainIdParam, 10);
    if (Number.isNaN(chainId)) {
      throw new BadRequestException('chainId query parameter is required');
    }
    const type = contractType ?? 'crypto_timelock';
    return {
      chainId,
      contractType: type,
      address: this.service.getCurrent(chainId, type),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.service.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(
    @CurrentUser('id') userId: number,
    @Body() dto: RegisterFactoryDto,
  ) {
    await this.ensureAdmin(userId);
    return this.service.register(userId, dto);
  }

  private async ensureAdmin(userId: number): Promise<void> {
    const isAdmin = await this.adminService.checkAdminAccess(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin role required to manage factory deployments.');
    }
  }
}

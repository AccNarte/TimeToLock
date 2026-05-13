import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private async ensureAdmin(userId: number): Promise<void> {
    const isAdmin = await this.adminService.checkAdminAccess(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  async getUserDetails(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.getUserDetails(targetUserId);
  }

  @Put('users/:id/role')
  async setUserRole(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body('roleName') roleName: string,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.setUserRole(targetUserId, roleName);
  }

  @Get('roles')
  async getRoles(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.adminService.getRoles();
  }

  @Get('check-access')
  async checkAccess(@CurrentUser('id') userId: number) {
    const isAdmin = await this.adminService.checkAdminAccess(userId);
    return { isAdmin };
  }
}

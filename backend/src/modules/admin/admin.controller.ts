import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Body,
  Query,
  Header,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ListUsersDto } from './dto/list-users.dto';
import { AuditService } from '../audit/audit.service';
import { ListAuditDto } from '../audit/dto/list-audit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

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
  async getUsers(
    @CurrentUser('id') userId: number,
    @Query() query: ListUsersDto,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.listUsers(query);
  }

  // Must be declared BEFORE `users/:id` so the literal 'export' isn't captured
  // by the numeric :id param.
  @Get('users/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users-export.csv"')
  async exportUsers(
    @CurrentUser('id') userId: number,
    @Query() query: ListUsersDto,
  ): Promise<string> {
    await this.ensureAdmin(userId);
    return this.adminService.exportUsersCsv(query);
  }

  @Get('users/:id')
  async getUserDetails(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.getUserDetails(targetUserId);
  }

  @Post('users/:id/ban')
  async banUser(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body()
    body: { reason?: string; password?: string; signature?: string; message?: string },
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.banUser(targetUserId, userId, body.reason, {
      password: body.password,
      signature: body.signature,
      message: body.message,
    });
  }

  @Post('users/:id/restore')
  async restoreUser(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.restoreUser(targetUserId, userId);
  }

  @Put('users/:id/role')
  async setUserRole(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body() body: { roleName: string; password?: string; signature?: string; message?: string },
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.setUserRole(targetUserId, body.roleName, userId, {
      password: body.password,
      signature: body.signature,
      message: body.message,
    });
  }

  @Get('challenge-method')
  async getChallengeMethod(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.adminService.getActingAdminAuthMethod(userId);
  }

  @Delete('users/:id')
  async deleteUser(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body() body: { password?: string; signature?: string; message?: string },
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.deleteUser(targetUserId, userId, {
      password: body.password,
      signature: body.signature,
      message: body.message,
    });
  }

  @Put('users/:id/email')
  async setUserEmail(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body('email') email: string,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.setUserEmail(targetUserId, email, userId);
  }

  @Put('users/:id/password')
  async setUserPassword(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body()
    body: { newPassword: string; password?: string; signature?: string; message?: string },
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.setUserPassword(targetUserId, body.newPassword, userId, {
      password: body.password,
      signature: body.signature,
      message: body.message,
    });
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

  @Get('audit')
  async getAudit(
    @CurrentUser('id') userId: number,
    @Query() query: ListAuditDto,
  ) {
    await this.ensureAdmin(userId);
    return this.auditService.findPaginated(query);
  }
}

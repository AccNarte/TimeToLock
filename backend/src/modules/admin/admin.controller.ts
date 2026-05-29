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

/**
 * Contrôleur du panel d'administration (`/admin`).
 *
 * Toutes les routes sont déjà protégées par `JwtAuthGuard`, puis chaque
 * handler ajoute `ensureAdmin(userId)` qui vérifie en base que
 * l'utilisateur connecté a bien le rôle `admin` ou `superadmin`.
 *
 * Les actions sensibles (ban, suppression, changement de rôle/email/mdp)
 * exigent en plus une re-authentification via `verifyAdminChallenge`
 * côté service (mot de passe ou signature wallet horodatée).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  /** Garde-fou commun à toutes les routes : 403 si l'utilisateur n'est pas admin. */
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

  // Doit être déclarée AVANT `users/:id`, sinon le literal `export` serait
  // capturé comme un id numérique par ParseIntPipe et renverrait du 400.
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

  /** Suspension d'un compte (soft-delete réversible). Exige une re-auth admin. */
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

  /** Réactivation d'un compte suspendu (pas de challenge — action de récupération). */
  @Post('users/:id/restore')
  async restoreUser(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.restoreUser(targetUserId, userId);
  }

  /** Changement de rôle d'un compte. Exige une re-auth admin. */
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

  /**
   * Renvoie la méthode de challenge attendue pour l'admin connecté :
   * `password` s'il a un compte email/mdp, `wallet` s'il s'est inscrit
   * par signature. Le front s'en sert pour afficher la bonne modale.
   */
  @Get('challenge-method')
  async getChallengeMethod(@CurrentUser('id') userId: number) {
    await this.ensureAdmin(userId);
    return this.adminService.getActingAdminAuthMethod(userId);
  }

  /** Suppression définitive d'un compte. Exige une re-auth admin. */
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

  /** Modification de l'email d'un compte (force la re-vérification email). */
  @Put('users/:id/email')
  async setUserEmail(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body('email') email: string,
  ) {
    await this.ensureAdmin(userId);
    return this.adminService.setUserEmail(targetUserId, email, userId);
  }

  /** Réinitialisation du mot de passe d'un compte email. Exige une re-auth admin. */
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

  /**
   * Endpoint léger utilisé par le front pour savoir s'il faut afficher
   * le menu admin dans la sidebar. Pas de `ensureAdmin` ici, juste un
   * booléen ; les routes sensibles ont leur propre garde.
   */
  @Get('check-access')
  async checkAccess(@CurrentUser('id') userId: number) {
    const isAdmin = await this.adminService.checkAdminAccess(userId);
    return { isAdmin };
  }

  /**
   * Journal d'audit complet, paginé et filtré, pour le panel admin.
   * (La version par utilisateur, plus légère, est sur `/audit` et est
   * consommée par le dashboard.)
   */
  @Get('audit')
  async getAudit(
    @CurrentUser('id') userId: number,
    @Query() query: ListAuditDto,
  ) {
    await this.ensureAdmin(userId);
    return this.auditService.findPaginated(query);
  }
}

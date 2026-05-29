import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './audit.entity';
import { EntityType } from './entity-type.entity';
import { Action } from './action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, EntityType, Action])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}



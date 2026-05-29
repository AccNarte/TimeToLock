import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactoryDeployment } from './factory-deployment.entity';
import { FactoryDeploymentsService } from './factory-deployments.service';
import { FactoryDeploymentsController } from './factory-deployments.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([FactoryDeployment]), AdminModule],
  controllers: [FactoryDeploymentsController],
  providers: [FactoryDeploymentsService],
  exports: [FactoryDeploymentsService],
})
export class FactoryDeploymentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelockFilesController } from './timelock-files.controller';
import { TimelockFilesService } from './timelock-files.service';
import { FileLock } from './file-lock.entity';
import { File } from '../files/file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileLock, File])],
  controllers: [TimelockFilesController],
  providers: [TimelockFilesService],
  exports: [TimelockFilesService],
})
export class TimelockFilesModule {}



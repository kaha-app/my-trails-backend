import { Module } from '@nestjs/common';
import { HikesController } from './hikes.controller';
import { HikesService } from './hikes.service';
import { SyncService } from './services/sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../common/upload.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [PrismaModule, UploadModule, SyncModule],
  controllers: [HikesController],
  providers: [HikesService, SyncService],
  exports: [HikesService, SyncService],
})
export class HikesModule {}

import { Module } from '@nestjs/common';
import { TrailsService } from './trails.service';
import { TrailsController } from './trails.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from '../common/upload.service';
import { TrailOwnerGuard } from './trail-owner.guard';

@Module({
  imports: [PrismaModule],
  controllers: [TrailsController],
  providers: [TrailsService, UploadService, TrailOwnerGuard],
  exports: [TrailsService],
})
export class TrailsModule {}

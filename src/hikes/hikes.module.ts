import { Module } from '@nestjs/common';
import { HikesController } from './hikes.controller';
import { HikesService } from './hikes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../common/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [HikesController],
  providers: [HikesService],
})
export class HikesModule {}

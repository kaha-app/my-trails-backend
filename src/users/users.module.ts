import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from '../common/upload.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UploadService],
  exports: [UsersService],
})
export class UsersModule {}

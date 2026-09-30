import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from '../common/upload.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UploadService, AdminGuard, SelfOrAdminGuard],
  exports: [UsersService],
})
export class UsersModule {}

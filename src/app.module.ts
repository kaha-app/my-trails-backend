import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TrailsModule } from './trails/trails.module';
import { FavouritesModule } from './favourites/favourites.module';
import { HikesModule } from './hikes/hikes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    TrailsModule,
    FavouritesModule,
    HikesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
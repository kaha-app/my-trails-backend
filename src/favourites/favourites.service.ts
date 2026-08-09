import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavouritesService {
  constructor(private prisma: PrismaService) {}

  async addToFavourites(trailId: bigint, userId: bigint) {
    // Check if trail exists
    const trail = await this.prisma.trail.findUnique({
      where: { id: trailId },
    });

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    return this.prisma.trailFavourite.create({
      data: {
        trailId,
        userId,
      },
    });
  }

  async removeFromFavourites(trailId: bigint, userId: bigint) {
    // Check if trail exists
    const trail = await this.prisma.trail.findUnique({
      where: { id: trailId },
    });

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    await this.prisma.trailFavourite.delete({
      where: {
        userId_trailId: {
          userId,
          trailId,
        },
      },
    });

    return { message: 'Removed from favourites' };
  }

  async getUserFavourites(userId: bigint, skip = 0, take = 10) {
    const favourites = await this.prisma.trailFavourite.findMany({
      where: { userId },
      skip,
      take,
      include: {
        trail: {
          include: {
            location: true,
            ratingSummary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.trailFavourite.count({
      where: { userId },
    });

    return {
      data: favourites,
      total,
      skip,
      take,
    };
  }

  async isFavourite(trailId: bigint, userId: bigint) {
    const favourite = await this.prisma.trailFavourite.findUnique({
      where: {
        userId_trailId: {
          userId,
          trailId,
        },
      },
    });

    return { isFavourite: !!favourite };
  }
}

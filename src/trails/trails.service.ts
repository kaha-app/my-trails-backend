import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';

@Injectable()
export class TrailsService {
  constructor(private prisma: PrismaService) {}

  async create(createTrailDto: CreateTrailDto) {
    // Check if slug already exists
    const existingTrail = await this.prisma.trail.findUnique({
      where: { slug: createTrailDto.slug },
    });

    if (existingTrail) {
      throw new ConflictException('Slug already exists');
    }

    return this.prisma.trail.create({
      data: createTrailDto,
    });
  }

  async findAll(skip = 0, take = 10, filters?: any) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.activity) where.activity = filters.activity;
    if (filters?.search) {
      where.OR = [
        { hikeName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const trails = await this.prisma.trail.findMany({
      where,
      skip,
      take,
      include: {
        location: true,
        ratingSummary: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.trail.count({ where });

    return {
      data: trails,
      total,
      skip,
      take,
    };
  }

  async findById(id: bigint) {
    const trail = await this.prisma.trail.findUnique({
      where: { id },
      include: {
        location: true,
        transportation: true,
        ratingSummary: {
          include: {
            breakdowns: true,
          },
        },
        itineraryPhases: {
          include: {
            details: true,
          },
        },
        highlights: true,
        pointsOfInterest: true,
        costItems: true,
        recommendedSeasons: true,
        avoidedMonths: true,
        safetyItems: true,
        media: true,
        reviews: {
          where: { status: 'approved' },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        favourites: true,
      },
    });

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    return trail;
  }

  async update(id: bigint, updateTrailDto: UpdateTrailDto) {
    const trail = await this.findById(id);

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    // Check if slug is being changed and if new slug already exists
    if (updateTrailDto.slug && updateTrailDto.slug !== trail.slug) {
      const existingSlug = await this.prisma.trail.findUnique({
        where: { slug: updateTrailDto.slug },
      });

      if (existingSlug) {
        throw new ConflictException('Slug already exists');
      }
    }

    return this.prisma.trail.update({
      where: { id },
      data: updateTrailDto,
    });
  }

  async remove(id: bigint) {
    const trail = await this.findById(id);

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    await this.prisma.trail.delete({
      where: { id },
    });

    return { message: 'Trail deleted successfully' };
  }

  async publish(id: bigint) {
    const trail = await this.findById(id);

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    return this.prisma.trail.update({
      where: { id },
      data: {
        status: 'active',
        publishedAt: new Date(),
      },
    });
  }
}

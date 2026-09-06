import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../common/upload.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';

@Injectable()
export class TrailsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(createTrailDto: CreateTrailDto) {
    // Check if slug already exists
    const existingTrail = await this.prisma.trail.findUnique({
      where: { slug: createTrailDto.slug },
    });

    if (existingTrail) {
      throw new ConflictException('Slug already exists');
    }

    const { region, country, gpxFilePath, ...trailData } = createTrailDto;

    return this.prisma.trail.create({
      data: {
        ...trailData,
        activity: trailData.activity || 'hiking',
        routeFilePath: gpxFilePath,
        routeFileType: gpxFilePath ? 'gpx' : undefined,
        ratingSummary: {
          create: {
            average: 0,
            reviewCount: 0,
            breakdownType: 'count',
          },
        },
        location: region || country ? {
          create: {
            region: region || '',
            country: country || '',
          },
        } : undefined,
      } as any,
      include: {
        location: true,
        ratingSummary: true,
      },
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
        media: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.trail.count({ where });

    // Extract cover photo from media for each trail
    const data = trails.map((trail: any) => ({
      ...trail,
      coverPhoto: trail.media.find((m: any) => m.type === 'cover') || null,
    }));

    return {
      data,
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

    // Extract cover photo from media array for convenience
    const coverPhoto = trail.media.find((m: any) => m.type === 'cover');

    return {
      ...trail,
      coverPhoto,
    };
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

    // Extract nested objects
    const { location, transportation, highlights, pointsOfInterest, costItems, recommendedSeasons, avoidedMonths, safetyItems, ...trailData } = updateTrailDto;

    // Update trail basic info
    // Cast routeFileType to enum if provided
    const dataToUpdate: any = { ...trailData };
    if (dataToUpdate.routeFileType && typeof dataToUpdate.routeFileType === 'string') {
      dataToUpdate.routeFileType = dataToUpdate.routeFileType as any;
    }

    const updatedTrail = await this.prisma.trail.update({
      where: { id },
      data: dataToUpdate,
    });

    // Update location if provided
    if (location) {
      const { ...locationData } = location;
      await this.prisma.trailLocation.upsert({
        where: { trailId: id },
        update: locationData,
        create: {
          trailId: id,
          region: locationData.region || '',
          country: locationData.country || '',
        },
      });
    }

    // Update transportation if provided
    if (transportation) {
      await this.prisma.trailTransportation.upsert({
        where: { trailId: id },
        update: transportation,
        create: {
          trailId: id,
          ...transportation,
        },
      });
    }

    // Update highlights if provided
    if (highlights && Array.isArray(highlights)) {
      // Delete existing highlights
      await this.prisma.trailHighlight.deleteMany({
        where: { trailId: id },
      });

      // Create new highlights
      for (const highlight of highlights) {
        await this.prisma.trailHighlight.create({
          data: {
            trailId: id,
            text: highlight.text,
            sortOrder: highlight.sortOrder || 0,
          },
        });
      }
    }

    // Update points of interest if provided
    if (pointsOfInterest && Array.isArray(pointsOfInterest)) {
      // Delete existing POIs
      await this.prisma.pointOfInterest.deleteMany({
        where: { trailId: id },
      });

      // Create new POIs
      for (const poi of pointsOfInterest) {
        await this.prisma.pointOfInterest.create({
          data: {
            trailId: id,
            name: poi.name,
            description: poi.description,
            distanceKm: poi.distanceKm,
            icon: poi.icon,
            altitudeM: poi.altitudeM,
            facilities: poi.facilities || [],
            images: poi.images || [],
            sortOrder: poi.sortOrder || 0,
          },
        });
      }
    }

    // Update cost items if provided
    if (costItems && Array.isArray(costItems)) {
      // Delete existing cost items
      await this.prisma.trailCostItem.deleteMany({
        where: { trailId: id },
      });

      // Create new cost items
      for (const item of costItems) {
        await this.prisma.trailCostItem.create({
          data: {
            trailId: id,
            type: item.type as any,
            text: item.text,
            sortOrder: item.sortOrder || 0,
          },
        });
      }
    }

    // Update recommended seasons if provided
    if (recommendedSeasons && Array.isArray(recommendedSeasons)) {
      // Delete existing seasons
      await this.prisma.trailRecommendedSeason.deleteMany({
        where: { trailId: id },
      });

      // Create new seasons
      for (const season of recommendedSeasons) {
        await this.prisma.trailRecommendedSeason.create({
          data: {
            trailId: id,
            season: season.season,
            sortOrder: season.sortOrder || 0,
          },
        });
      }
    }

    // Update avoided months if provided
    if (avoidedMonths && Array.isArray(avoidedMonths)) {
      // Delete existing months
      await this.prisma.trailAvoidedMonth.deleteMany({
        where: { trailId: id },
      });

      // Create new months
      for (const month of avoidedMonths) {
        await this.prisma.trailAvoidedMonth.create({
          data: {
            trailId: id,
            monthLabel: month.monthLabel,
            monthNumber: month.monthNumber,
            reason: month.reason,
            sortOrder: month.sortOrder || 0,
          },
        });
      }
    }

    // Update safety items if provided
    if (safetyItems && Array.isArray(safetyItems)) {
      // Delete existing safety items
      await this.prisma.trailSafetyItem.deleteMany({
        where: { trailId: id },
      });

      // Create new safety items
      for (const item of safetyItems) {
        await this.prisma.trailSafetyItem.create({
          data: {
            trailId: id,
            type: item.type as any,
            text: item.text,
            sortOrder: item.sortOrder || 0,
          },
        });
      }
    }

    // Return updated trail with all details
    return this.findById(id);
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

  // Individual add methods for step-by-step trail creation
  async addItineraryPhase(id: bigint, phaseData: any) {
    await this.findById(id);
    return this.prisma.itineraryPhase.create({
      data: {
        ...phaseData,
        trailId: id,
        details: phaseData.details ? {
          create: phaseData.details.map((detail: any) => ({
            detail: detail.detail,
            sortOrder: detail.sortOrder || 0,
          })),
        } : undefined,
      },
    });
  }

  async addHighlight(id: bigint, data: any) {
    await this.findById(id);
    return this.prisma.trailHighlight.create({
      data: {
        ...data,
        trailId: id,
      },
    });
  }

  async addPointOfInterest(id: bigint, data: any, files?: { images?: Express.Multer.File[] }) {
    await this.findById(id);

    // Handle empty or undefined data
    if (!data || (Object.keys(data).length === 0 && (!files?.images || files.images.length === 0))) {
      throw new Error('POI name is required');
    }

    // Process uploaded images
    let imageUrls: string[] = [];
    if (files?.images && files.images.length > 0) {
      imageUrls = files.images.map((file) => this.uploadService.uploadFile(file, 'images'));
    }

    // Merge with provided image URLs if any
    const allImages = [
      ...(data?.images && Array.isArray(data.images) ? data.images : []),
      ...imageUrls,
    ];

    return this.prisma.pointOfInterest.create({
      data: {
        name: data?.name || 'Untitled POI',
        description: data?.description,
        distanceKm: data?.distanceKm ? parseFloat(data.distanceKm) : undefined,
        icon: data?.icon,
        altitudeM: data?.altitudeM ? parseInt(data.altitudeM) : undefined,
        latitude: data?.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data?.longitude ? parseFloat(data.longitude) : undefined,
        facilities: data?.facilities && Array.isArray(data.facilities) ? data.facilities : [],
        images: allImages.length > 0 ? allImages : [],
        sortOrder: data?.sortOrder ? parseInt(data.sortOrder) : 0,
        trailId: id,
      } as any,
    });
  }

  async addCostItem(id: bigint, data: any) {
    await this.findById(id);
    return this.prisma.trailCostItem.create({
      data: {
        ...data,
        trailId: id,
      },
    });
  }

  async addSafetyItem(id: bigint, data: any) {
    await this.findById(id);
    return this.prisma.trailSafetyItem.create({
      data: {
        ...data,
        trailId: id,
      },
    });
  }

  async addSeason(id: bigint, data: any) {
    await this.findById(id);
    return this.prisma.trailRecommendedSeason.create({
      data: {
        ...data,
        trailId: id,
      },
    });
  }

  async addAvoidedMonth(id: bigint, data: any) {
    await this.findById(id);
    return this.prisma.trailAvoidedMonth.create({
      data: {
        ...data,
        trailId: id,
      },
    });
  }

  async addTransportation(id: bigint, data: any) {
    const trail = await this.findById(id);

    // Check if transportation already exists
    const existingTransportation = await this.prisma.trailTransportation.findUnique({
      where: { trailId: id },
    });

    if (existingTransportation) {
      // Update existing transportation
      return this.prisma.trailTransportation.update({
        where: { trailId: id },
        data: {
          privateOption: data.privateOption,
          publicOption: data.publicOption,
          returnOption: data.returnOption,
        },
      });
    }

    // Create new transportation
    return this.prisma.trailTransportation.create({
      data: {
        trailId: id,
        privateOption: data.privateOption,
        publicOption: data.publicOption,
        returnOption: data.returnOption,
      },
    });
  }

  async addMedia(id: bigint, data: any, files?: { images?: Express.Multer.File[] }) {
    await this.findById(id);

    // If files provided, create one media entry per file
    if (files?.images && files.images.length > 0) {
      const mediaItems = files.images.map((file, index) => {
        const url = this.uploadService.uploadFile(file, 'images');
        return {
          trailId: id,
          type: data?.type || 'gallery',
          url: url,
          altText: data?.altText,
          sortOrder: (data?.sortOrder ? parseInt(data.sortOrder) : 0) + index,
          isActive: true,
        };
      });

      return this.prisma.trailMedia.createMany({
        data: mediaItems,
      });
    }

    // If URL provided but no files, create media entry with URL
    if (data?.url) {
      return this.prisma.trailMedia.create({
        data: {
          trailId: id,
          type: data.type || 'gallery',
          url: data.url,
          altText: data.altText,
          sortOrder: data.sortOrder ? parseInt(data.sortOrder) : 0,
          isActive: true,
        } as any,
      });
    }

    throw new Error('Either files or URL must be provided');
  }

  async uploadGpx(files?: { gpxFile?: Express.Multer.File[] }) {
    if (!files?.gpxFile || files.gpxFile.length === 0) {
      throw new Error('GPX file is required. Please upload a GPX file.');
    }

    const gpxFile = files.gpxFile[0];
    const gpxFilePath = this.uploadService.uploadGpxFile(gpxFile);

    return {
      gpxFilePath,
      message: 'GPX file uploaded successfully. Use this path in trail creation.',
    };
  }

  async uploadCoverPhoto(id: bigint, files?: { coverPhoto?: Express.Multer.File[] }) {
    const trail = await this.findById(id);

    if (!files?.coverPhoto || files.coverPhoto.length === 0) {
      throw new BadRequestException('Cover photo is required. Please upload a photo.');
    }

    const coverPhotoFile = files.coverPhoto[0];
    
    // Upload using dedicated method
    const coverPhotoUrl = this.uploadService.uploadCoverPhoto(coverPhotoFile);

    // Create media entry as cover photo
    const media = await this.prisma.trailMedia.create({
      data: {
        trailId: id,
        type: 'cover',
        url: coverPhotoUrl,
        altText: `${trail.hikeName} cover photo`,
        sortOrder: 0,
        isActive: true,
      },
    });

    return {
      coverPhotoUrl,
      mediaId: media.id,
      message: 'Cover photo uploaded successfully',
    };
  }

  async uploadGpxRoute(id: bigint, files?: { gpxFile?: Express.Multer.File[] }) {
    await this.findById(id);

    if (!files?.gpxFile || files.gpxFile.length === 0) {
      throw new Error('GPX file is required. Please upload a GPX file.');
    }

    const gpxFile = files.gpxFile[0];
    const routeFilePath = this.uploadService.uploadGpxFile(gpxFile);

    return this.prisma.trail.update({
      where: { id },
      data: {
        routeFilePath,
        routeFileType: 'gpx',
      },
    });
  }
}

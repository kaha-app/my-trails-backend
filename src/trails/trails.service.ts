import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../common/upload.service';
import { Readable } from 'stream';
import { existsSync } from 'fs';
import { recordedGpx } from './recorded-gpx';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';

function uniqueSortOrder(
  requested: number | undefined,
  index: number,
  used: Set<number>,
) {
  let value = Number.isInteger(requested) ? requested! : index;
  if (used.has(value)) {
    value = index;
    while (used.has(value)) value += 1;
  }
  used.add(value);
  return value;
}

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
        location:
          region || country
            ? {
                create: {
                  region: region || '',
                  country: country || '',
                },
              }
            : undefined,
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
          orderBy: [{ sortOrder: 'asc' }, { phaseNumber: 'asc' }],
          include: {
            details: { orderBy: { sortOrder: 'asc' } },
          },
        },
        highlights: true,
        pointsOfInterest: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        hikeWaypoints: {
          include: { photos: true },
          orderBy: { timestamp: 'asc' },
        },
        hikeSessions: {
          orderBy: { startTime: 'asc' },
          include: {
            trackPoints: { orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] },
          },
        },
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

    // Build GPX download URL if GPX file exists
    const routeFileUrl =
      trail.routeFilePath ||
      trail.hikeSessions.some((s) => s.trackPoints.length)
        ? `/api/trails/${id}/download-gpx`
        : null;

    const { hikeSessions, hikeWaypoints, ...detail } = trail;
    const recordedPoints = hikeSessions.flatMap(
      (session) => session.trackPoints,
    );
    const elevations = recordedPoints
      .filter((p) => p.elevation != null)
      .map((p) => Number(p.elevation));
    const poiKey = (name: unknown, latitude: unknown, longitude: unknown) =>
      `${String(name ?? '')
        .trim()
        .toLowerCase()}|${Number(latitude).toFixed(6)}|${Number(longitude).toFixed(6)}`;
    const projectedPoiKeys = new Set(
      trail.pointsOfInterest.map((poi) =>
        poiKey(poi.name, poi.latitude, poi.longitude),
      ),
    );
    const recordedPois = hikeWaypoints
      .filter(
        (waypoint) =>
          !projectedPoiKeys.has(
            poiKey(
              waypoint.name ?? 'Waypoint',
              waypoint.latitude,
              waypoint.longitude,
            ),
          ),
      )
      .map((wp) => ({
        id: `recorded:${wp.id}`,
        trailId: id,
        name: wp.name ?? 'Waypoint',
        description: wp.description,
        latitude: wp.latitude,
        longitude: wp.longitude,
        altitudeM:
          wp.elevation == null ? null : Math.round(Number(wp.elevation)),
        distanceKm: wp.distanceFromStart,
        icon: wp.type,
        facilities: wp.facilities,
        images: wp.photos.map((photo) => photo.photoUrl),
      }));
    return {
      ...detail,
      // A projected POI and a recorded waypoint can coexist. Do not hide
      // recorded intersections merely because one edited POI already exists.
      pointsOfInterest: [...trail.pointsOfInterest, ...recordedPois],
      maxAltitudeM:
        trail.maxAltitudeM ??
        (elevations.length
          ? Math.round(elevations.reduce((a, b) => Math.max(a, b)))
          : null),
      routeFileContent: recordedPoints.length
        ? Buffer.from(recordedGpx(trail.hikeName, hikeSessions)).toString(
            'base64',
          )
        : null,
      coverPhoto,
      routeFileUrl, // Add download URL for frontend to use
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

    await this.prisma.$transaction(async (tx) => {
      // Extract nested objects
      const {
        location,
        transportation,
        highlights,
        itineraryPhases,
        pointsOfInterest,
        costItems,
        recommendedSeasons,
        avoidedMonths,
        safetyItems,
        ...trailData
      } = updateTrailDto;

      // Update trail basic info
      // Cast routeFileType to enum if provided
      const dataToUpdate: any = { ...trailData };
      if (
        dataToUpdate.routeFileType &&
        typeof dataToUpdate.routeFileType === 'string'
      ) {
        dataToUpdate.routeFileType = dataToUpdate.routeFileType as any;
      }

      await tx.trail.update({
        where: { id },
        data: dataToUpdate,
      });

      // Update location if provided
      if (location) {
        const { ...locationData } = location;
        await tx.trailLocation.upsert({
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
        await tx.trailTransportation.upsert({
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
        await tx.trailHighlight.deleteMany({
          where: { trailId: id },
        });

        // Create new highlights
        const usedHighlightOrder = new Set<number>();
        for (const [index, highlight] of highlights.entries()) {
          await tx.trailHighlight.create({
            data: {
              trailId: id,
              text: highlight.text,
              sortOrder: uniqueSortOrder(
                highlight.sortOrder,
                index,
                usedHighlightOrder,
              ),
            },
          });
        }
      }

      // Update itinerary phases if provided
      if (itineraryPhases && Array.isArray(itineraryPhases)) {
        // Delete existing phases and their details
        await tx.itineraryPhase.deleteMany({
          where: { trailId: id },
        });

        // Create new phases with details
        const usedPhaseOrder = new Set<number>();
        for (const [index, phase] of itineraryPhases.entries()) {
          const newPhase = await tx.itineraryPhase.create({
            data: {
              trailId: id,
              phaseNumber: phase.phaseNumber,
              title: phase.title,
              durationLabel: phase.durationLabel || null,
              durationMinutes: phase.durationMinutes ?? null,
              altitudeM: phase.altitudeM ?? null,
              sortOrder: uniqueSortOrder(
                phase.sortOrder,
                index,
                usedPhaseOrder,
              ),
            },
          });

          // Add phase details
          if (phase.details && Array.isArray(phase.details)) {
            const usedDetailOrder = new Set<number>();
            for (const [detailIndex, detail] of phase.details.entries()) {
              await tx.itineraryPhaseDetail.create({
                data: {
                  phaseId: newPhase.id,
                  detail: detail.detail,
                  sortOrder: uniqueSortOrder(
                    detail.sortOrder,
                    detailIndex,
                    usedDetailOrder,
                  ),
                },
              });
            }
          }
        }
      }

      // Upsert by server identity; editing a POI must not discard its photos
      // or recreate all other recorded POIs. Removal is a separate operation.
      if (pointsOfInterest) {
        for (const poi of pointsOfInterest) {
          const { id: poiId, latitude, longitude, distanceKm, ...fields } = poi;
          const data = {
            ...fields,
            ...(latitude !== undefined ? { latitude: Number(latitude) } : {}),
            ...(longitude !== undefined
              ? { longitude: Number(longitude) }
              : {}),
            ...(distanceKm !== undefined
              ? { distanceKm: Number(distanceKm) }
              : {}),
          };
          if (poiId?.startsWith('recorded:')) {
            const waypoint = await tx.hikeWaypoint.findFirst({
              where: { id: BigInt(poiId.substring(9)), trailId: id },
            });
            if (!waypoint)
              throw new BadRequestException(
                'Recorded POI does not belong to this trail',
              );
            await tx.pointOfInterest.create({ data: { ...data, trailId: id } });
          } else if (poiId) {
            const existing = await tx.pointOfInterest.findFirst({
              where: { id: BigInt(poiId), trailId: id },
            });
            if (!existing)
              throw new BadRequestException(
                'POI does not belong to this trail',
              );
            await tx.pointOfInterest.update({
              where: { id: existing.id },
              data,
            });
          } else {
            await tx.pointOfInterest.create({ data: { ...data, trailId: id } });
          }
        }
      }

      // Update cost items if provided
      if (costItems && Array.isArray(costItems)) {
        // Delete existing cost items
        await tx.trailCostItem.deleteMany({
          where: { trailId: id },
        });

        // Create new cost items
        const usedCostOrder = new Map<string, Set<number>>();
        for (const [index, item] of costItems.entries()) {
          const used = usedCostOrder.get(item.type) ?? new Set<number>();
          usedCostOrder.set(item.type, used);
          await tx.trailCostItem.create({
            data: {
              trailId: id,
              type: item.type as any,
              text: item.text,
              sortOrder: uniqueSortOrder(item.sortOrder, index, used),
            },
          });
        }
      }

      // Update recommended seasons if provided
      if (recommendedSeasons && Array.isArray(recommendedSeasons)) {
        // Delete existing seasons
        await tx.trailRecommendedSeason.deleteMany({
          where: { trailId: id },
        });

        // Create new seasons
        const usedSeasonOrder = new Set<number>();
        for (const [index, season] of recommendedSeasons.entries()) {
          await tx.trailRecommendedSeason.create({
            data: {
              trailId: id,
              season: season.season,
              sortOrder: uniqueSortOrder(
                season.sortOrder,
                index,
                usedSeasonOrder,
              ),
            },
          });
        }
      }

      // Update avoided months if provided
      if (avoidedMonths && Array.isArray(avoidedMonths)) {
        // Delete existing months
        await tx.trailAvoidedMonth.deleteMany({
          where: { trailId: id },
        });

        // Create new months
        const usedMonthOrder = new Set<number>();
        for (const [index, month] of avoidedMonths.entries()) {
          await tx.trailAvoidedMonth.create({
            data: {
              trailId: id,
              monthLabel: month.monthLabel,
              monthNumber: month.monthNumber,
              reason: month.reason,
              sortOrder: uniqueSortOrder(
                month.sortOrder,
                index,
                usedMonthOrder,
              ),
            },
          });
        }
      }

      // Update safety items if provided
      if (safetyItems && Array.isArray(safetyItems)) {
        // Delete existing safety items
        await tx.trailSafetyItem.deleteMany({
          where: { trailId: id },
        });

        // Create new safety items
        const usedSafetyOrder = new Map<string, Set<number>>();
        for (const [index, item] of safetyItems.entries()) {
          const used = usedSafetyOrder.get(item.type) ?? new Set<number>();
          usedSafetyOrder.set(item.type, used);
          await tx.trailSafetyItem.create({
            data: {
              trailId: id,
              type: item.type as any,
              text: item.text,
              sortOrder: uniqueSortOrder(item.sortOrder, index, used),
            },
          });
        }
      }
    });

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
    this.validateForPublish(trail);

    return this.prisma.trail.update({
      where: { id },
      data: {
        status: 'active',
        publishedAt: new Date(),
      },
    });
  }

  async togglePublish(id: bigint) {
    const trail = await this.findById(id);

    if (!trail) {
      throw new NotFoundException('Trail not found');
    }

    const newStatus = trail.status === 'active' ? 'draft' : 'active';
    if (newStatus === 'active') {
      this.validateForPublish(trail);
    }

    return this.prisma.trail.update({
      where: { id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'active' ? new Date() : null,
      },
    });
  }

  private validateForPublish(trail: any) {
    const missing: string[] = [];
    const hasText = (value: unknown) =>
      typeof value === 'string' && value.trim().length > 0;
    const positive = (value: unknown) =>
      value != null && Number.isFinite(Number(value)) && Number(value) > 0;

    if (!hasText(trail.hikeName)) missing.push('hike name');
    if (!hasText(trail.description)) missing.push('description');
    if (!hasText(trail.location?.region)) missing.push('region');
    if (!hasText(trail.location?.country)) missing.push('country');
    if (!positive(trail.durationDays)) missing.push('duration');
    if (!positive(trail.distanceMinKm)) missing.push('minimum distance');
    if (!positive(trail.distanceMaxKm)) missing.push('maximum distance');
    if (!positive(trail.walkingTimeMinMinutes))
      missing.push('minimum walking time');
    if (!positive(trail.walkingTimeMaxMinutes))
      missing.push('maximum walking time');
    if (!positive(trail.maxAltitudeM)) missing.push('maximum altitude');
    if (!hasText(trail.difficulty)) missing.push('difficulty');
    if (!hasText(trail.activity)) missing.push('activity');
    if (!trail.itineraryPhases?.length) missing.push('itinerary');
    if (!trail.highlights?.length) missing.push('highlight');
    if (!trail.pointsOfInterest?.length) missing.push('point of interest');
    if (!hasText(trail.routeFilePath) && !hasText(trail.routeFileContent)) {
      missing.push('GPX route');
    }

    if (missing.length) {
      throw new BadRequestException(
        `Complete required fields before publishing: ${missing.join(', ')}`,
      );
    }
  }

  // Individual add methods for step-by-step trail creation
  async addItineraryPhase(id: bigint, phaseData: any) {
    await this.findById(id);
    return this.prisma.itineraryPhase.create({
      data: {
        ...phaseData,
        trailId: id,
        details: phaseData.details
          ? {
              create: phaseData.details.map((detail: any) => ({
                detail: detail.detail,
                sortOrder: detail.sortOrder || 0,
              })),
            }
          : undefined,
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

  async addPointOfInterest(
    id: bigint,
    data: any,
    files?: { images?: Express.Multer.File[] },
  ) {
    await this.findById(id);

    // Handle empty or undefined data
    if (
      !data ||
      (Object.keys(data).length === 0 &&
        (!files?.images || files.images.length === 0))
    ) {
      throw new Error('POI name is required');
    }

    // Process uploaded images
    let imageUrls: string[] = [];
    if (files?.images && files.images.length > 0) {
      imageUrls = files.images.map((file) =>
        this.uploadService.uploadFile(file, 'images'),
      );
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
        facilities:
          data?.facilities && Array.isArray(data.facilities)
            ? data.facilities
            : [],
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
    const existingTransportation =
      await this.prisma.trailTransportation.findUnique({
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

  async uploadPoiImages(
    id: bigint,
    files?: { images?: Express.Multer.File[] },
  ) {
    await this.findById(id);
    if (!files?.images?.length)
      throw new BadRequestException('Images are required');
    return {
      urls: files.images.map((file) =>
        this.uploadService.uploadFile(file, 'hike-photos'),
      ),
    };
  }

  async addMedia(
    id: bigint,
    data: any,
    files?: { images?: Express.Multer.File[] },
  ) {
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
      message:
        'GPX file uploaded successfully. Use this path in trail creation.',
    };
  }

  async uploadCoverPhoto(
    id: bigint,
    files?: { coverPhoto?: Express.Multer.File[] },
  ) {
    const trail = await this.findById(id);

    if (!files?.coverPhoto || files.coverPhoto.length === 0) {
      throw new BadRequestException(
        'Cover photo is required. Please upload a photo.',
      );
    }

    const coverPhotoFile = files.coverPhoto[0];

    // Upload using dedicated method
    const coverPhotoUrl = this.uploadService.uploadCoverPhoto(coverPhotoFile);

    // Create media entry as cover photo
    const media = await this.prisma.$transaction(async (tx) => {
      await tx.trailMedia.deleteMany({ where: { trailId: id, type: 'cover' } });
      return tx.trailMedia.create({
        data: {
          trailId: id,
          type: 'cover',
          url: coverPhotoUrl,
          altText: `${trail.hikeName} cover photo`,
          sortOrder: 0,
          isActive: true,
        },
      });
    });

    return {
      coverPhotoUrl,
      mediaId: media.id,
      message: 'Cover photo uploaded successfully',
    };
  }

  async uploadGpxRoute(
    id: bigint,
    files?: { gpxFile?: Express.Multer.File[] },
  ) {
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

  async downloadGpx(id: bigint) {
    const trail = await this.prisma.trail.findUnique({
      where: { id },
      include: {
        hikeSessions: {
          orderBy: { startTime: 'asc' },
          include: {
            trackPoints: { orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] },
          },
        },
      },
    });
    if (!trail) throw new NotFoundException('Trail not found');
    const filePath = trail.routeFilePath && `.${trail.routeFilePath}`;
    if (
      filePath &&
      trail.routeFilePath?.startsWith('/uploads/') &&
      existsSync(filePath)
    ) {
      return this.uploadService.getFileStream(filePath);
    }
    if (trail.hikeSessions.some((s) => s.trackPoints.length)) {
      return Readable.from([recordedGpx(trail.hikeName, trail.hikeSessions)]);
    }
    throw new NotFoundException('No GPX file available for this trail');
  }
}

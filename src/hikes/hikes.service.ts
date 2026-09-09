import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../common/upload.service';
import { OutboxService } from '../sync/outbox.service';

@Injectable()
export class HikesService {
  private prismaAny: any;
  private readonly logger = new Logger(HikesService.name);

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private outboxService?: OutboxService,
  ) {
    this.prismaAny = this.prisma as any;
  }

  async syncHike(dataString: string, photoFiles?: Express.Multer.File[]) {
    // Parse JSON data
    let syncHikeData: any;
    try {
      syncHikeData = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
    } catch (e) {
      throw new BadRequestException('Invalid JSON data format');
    }

    // Validate required fields
    if (!syncHikeData.trackPoints) syncHikeData.trackPoints = [];
    if (!syncHikeData.waypoints) syncHikeData.waypoints = [];
    if (!syncHikeData.userId) throw new BadRequestException('userId is required');

    const userId = BigInt(syncHikeData.userId);

    // Create hike session
    const session = await this.prismaAny.hikeSession.create({
      data: {
        trailId: BigInt(syncHikeData.trailId || 0),
        userId,
        startTime: new Date(syncHikeData.startTime),
        endTime: syncHikeData.endTime ? new Date(syncHikeData.endTime) : null,
        status: syncHikeData.status || 'completed',
        summary: syncHikeData.summary,
      },
    });

    // Process photo uploads
    const photoMap: Map<string, { serverId: number; url: string }> = new Map();
    if (photoFiles && photoFiles.length > 0) {
      for (const file of photoFiles) {
        const photoUrl = this.uploadService.uploadHikePhoto(file);
        const photoId = file.originalname.replace(/\.[^/.]+$/, '') || file.fieldname;
        photoMap.set(photoId, { serverId: 0, url: photoUrl });
      }
    }

    // Add track points
    if (syncHikeData.trackPoints && syncHikeData.trackPoints.length > 0) {
      const trackPoints = syncHikeData.trackPoints.map((tp: any) => ({
        sessionId: session.id,
        latitude: tp.latitude,
        longitude: tp.longitude,
        elevation: tp.elevation || tp.altitude,
        accuracy: tp.accuracy,
        heading: tp.heading,
        speed: tp.speed,
        timestamp: new Date(tp.timestamp || Date.now()),
      }));

      await this.prismaAny.trackPoint.createMany({
        data: trackPoints,
      });

      const totalDistance = this.calculateDistance(syncHikeData.trackPoints);
      const { minAltitude, maxAltitude } = this.calculateAltitudeStats(syncHikeData.trackPoints);
      const totalAltitude = maxAltitude - minAltitude;

      await this.prismaAny.hikeSession.update({
        where: { id: session.id },
        data: {
          totalDistance,
          totalAltitude,
          maxAltitude,
          minAltitude,
        },
      });
    }

    // Add waypoints with photos
    const recordedWaypoints: any[] = [];
    if (syncHikeData.waypoints && syncHikeData.waypoints.length > 0) {
      for (const wp of syncHikeData.waypoints) {
        const waypoint = await this.prismaAny.hikeWaypoint.create({
          data: {
            sessionId: session.id,
            trailId: BigInt(syncHikeData.trailId || 0),
            userId,
            name: wp.name,
            description: wp.description,
            type: wp.type,
            latitude: wp.latitude,
            longitude: wp.longitude,
            elevation: wp.elevation,
            facilities: wp.facilities || [],
            conditions: wp.conditions,
            distanceFromStart: wp.distanceFromStart,
            durationAtStart: wp.durationAtStart,
            timestamp: new Date(wp.timestamp || Date.now()),
          },
        });

        // Link photos to waypoint
        const waypointPhotos: any[] = [];
        if (wp.photoIds && Array.isArray(wp.photoIds)) {
          for (const photoId of wp.photoIds) {
            const photoInfo = photoMap.get(photoId);
            if (photoInfo) {
              const photo = await this.prismaAny.hikeWaypointPhoto.create({
                data: {
                  waypointId: waypoint.id,
                  userId,
                  photoUrl: photoInfo.url,
                  thumbnail: photoInfo.url,
                  latitude: wp.latitude,
                  longitude: wp.longitude,
                  elevation: wp.elevation,
                  timestamp: new Date(),
                },
              });

              waypointPhotos.push({
                localId: photoId,
                serverId: photo.id,
                url: photo.photoUrl,
              });
            }
          }
        }

        recordedWaypoints.push({
          localId: wp.id || `wp_${waypoint.id}`,
          serverId: waypoint.id,
          photos: waypointPhotos,
        });
      }
    }

    // Create sync status record
    await this.prismaAny.hikeSyncStatus.create({
      data: {
        sessionId: session.id,
        userId,
        isSynced: true,
        lastSyncSuccess: new Date(),
      },
    });

    // Add to outbox queue for processing
    if (this.outboxService) {
      try {
        await this.outboxService.addToOutbox(
          session.id,
          userId,
          'create',
          'hikeSession',
          session.id,
          {
            sessionId: session.id,
            trailId: session.trailId,
            userId: session.userId,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            totalDistance: session.totalDistance,
            totalAltitude: session.totalAltitude,
            trackPointsCount: syncHikeData.trackPoints.length,
            waypointsCount: recordedWaypoints.length,
            photosCount: photoFiles?.length || 0,
          },
        );
        this.logger.log(`Added hike ${session.id} to outbox for sync`);
      } catch (error) {
        this.logger.warn(`Failed to add to outbox: ${error.message}`);
      }
    }

    return {
      success: true,
      sessionId: session.id,
      trailId: session.trailId.toString(),
      userId: session.userId.toString(),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      totalDistance: syncHikeData.trackPoints.length > 0 ? this.calculateDistance(syncHikeData.trackPoints) : 0,
      totalAltitude: syncHikeData.trackPoints.length > 0 ? this.calculateAltitudeStats(syncHikeData.trackPoints).maxAltitude - this.calculateAltitudeStats(syncHikeData.trackPoints).minAltitude : 0,
      trackPointsCount: syncHikeData.trackPoints.length,
      waypointsCount: syncHikeData.waypoints.length,
      photosCount: photoFiles ? photoFiles.length : 0,
      recordedWaypoints,
      syncStatus: {
        isSynced: true,
        lastSyncAttempt: new Date().toISOString(),
        lastSyncSuccess: new Date().toISOString(),
        retryCount: 0,
      },
      message: `Hike synced successfully with ${photoFiles ? photoFiles.length : 0} photos`,
    };
  }

  async getRecordingHistory(skip: number, take: number, filters?: any) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.trailId) {
      where.trailId = filters.trailId;
    }

    const sessions = await this.prismaAny.hikeSession.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prismaAny.hikeSession.count({ where });

    const data = sessions.map((session: any) => ({
      id: session.id,
      trailId: session.trailId.toString(),
      userId: session.userId.toString(),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      totalDistance: session.totalDistance,
      totalAltitude: session.totalAltitude,
      maxAltitude: session.maxAltitude,
      minAltitude: session.minAltitude,
      trackPointsCount: 0, // Will be fetched separately if needed
      waypointsCount: 0,
      summary: session.summary,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

    return {
      data,
      total,
      skip,
      take,
    };
  }

  private calculateDistance(trackPoints: any[]): number {
    if (trackPoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const p1 = trackPoints[i - 1];
      const p2 = trackPoints[i];
      const distance = this.haversineDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude
      );
      totalDistance += distance;
    }
    return parseFloat(totalDistance.toFixed(2));
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateAltitudeStats(trackPoints: any[]): { minAltitude: number; maxAltitude: number } {
    if (trackPoints.length === 0) return { minAltitude: 0, maxAltitude: 0 };

    let min = trackPoints[0].altitude;
    let max = trackPoints[0].altitude;

    for (const point of trackPoints) {
      if (point.altitude < min) min = point.altitude;
      if (point.altitude > max) max = point.altitude;
    }

    return { minAltitude: min, maxAltitude: max };
  }
}

import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../../common/upload.service';
import { SyncRequestDto, SyncResponseDto } from '../dto/sync-trail.dto';
import * as crypto from 'crypto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // Configuration limits
  private readonly MAX_TRACK_POINTS = 100000;
  private readonly MAX_WAYPOINTS = 10000;
  private readonly MAX_IMAGES = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {
    this.logger.debug('SyncService initialized');
  }

  async syncTrail(
    userId: bigint,
    idempotencyKey: string,
    requestData: SyncRequestDto,
    imageFiles?: Map<string, Express.Multer.File>,
  ): Promise<SyncResponseDto> {
    try {
      // Validate schema version
      if (requestData.schemaVersion !== 1) {
        throw new BadRequestException(`Unsupported schema version: ${requestData.schemaVersion}`);
      }

      // Validate required fields
      this.validateSyncRequest(requestData);

      const { clientUuid, localRevision } = requestData;

      // Type cast Prisma client to access dynamic models
      const db = this.prisma as any;

      // Validate idempotency key
      const [keyClientUuid, keyRevision] = idempotencyKey.split(':');
      if (keyClientUuid !== clientUuid || parseInt(keyRevision) !== localRevision) {
        throw new BadRequestException('Idempotency key does not match request');
      }

      // Check for existing job with same idempotency key FIRST (for idempotent retries)
      const existingJob = await db.syncJobRecord.findUnique({
        where: { idempotencyKey },
      }).catch(() => null); // Catch if table doesn't exist yet

      if (existingJob && existingJob.completedAt) {
        const tracker = await db.hikeSyncTracker.findUnique({
          where: { id: existingJob.hikeSyncTrackerId },
        });
        this.logger.log(`Idempotent retry: returning cached response for ${clientUuid}`);
        return this.buildSyncResponse(tracker, requestData, userId);
      }

      if (existingJob && !existingJob.completedAt) {
        throw new BadRequestException('Sync already in progress for this revision');
      }

      // Check ownership
      let existingTracker = await db.hikeSyncTracker.findUnique({
        where: { clientUuid },
      }).catch(() => null);

      if (existingTracker && existingTracker.ownerUserId !== userId) {
        throw new ForbiddenException('Cannot upload records belonging to another user');
      }

      // Check for conflicts if record exists
      if (
        existingTracker &&
        requestData.baseServerVersion &&
        existingTracker.serverVersion &&
        requestData.baseServerVersion !== existingTracker.serverVersion
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Server version mismatch',
          currentServerVersion: existingTracker.serverVersion,
          clientBaseVersion: requestData.baseServerVersion,
        });
      }

      // Create tracker if new
      if (!existingTracker) {
        existingTracker = await db.hikeSyncTracker.create({
          data: {
            clientUuid,
            userId,
            ownerUserId: userId,
            localRevision,
            syncStatus: 'uploading',
          },
        });
      }

      // Create sync job
      const syncJob = await db.syncJobRecord.create({
        data: {
          hikeSyncTrackerId: existingTracker.id,
          idempotencyKey,
          revision: localRevision,
          status: 'uploading',
        },
      });

      try {
        // Process media uploads
        const mediaMapping = await this.processMediaUploads(
          existingTracker.id,
          userId,
          requestData.media,
          imageFiles,
          db,
        );

        // Create serverId if not exists
        const serverId = existingTracker.serverId || generateId();

        // Update tracker with server ID
        await db.hikeSyncTracker.update({
          where: { id: existingTracker.id },
          data: { serverId },
        });

        // Create or get session
        const sessionMappings = await this.syncRecordingSessions(
          existingTracker,
          userId,
          requestData.sessions || [],
          db,
        );

        // Create track points
        const trackPointCount = await this.syncTrackPoints(
          existingTracker,
          userId,
          requestData.trackPoints,
          sessionMappings,
          db,
        );

        // Create waypoints
        const waypointMappings = await this.syncWaypoints(
          existingTracker,
          userId,
          requestData.waypoints,
          sessionMappings,
          mediaMapping,
          db,
        );

        // Update tracker to synced
        const newServerVersion = (existingTracker.serverVersion || 0) + 1;
        await db.hikeSyncTracker.update({
          where: { id: existingTracker.id },
          data: {
            syncStatus: 'synced',
            syncedRevision: localRevision,
            serverVersion: newServerVersion,
            lastSyncedAt: new Date(),
            lastSyncError: null,
          },
        });

        // Mark job complete
        await db.syncJobRecord.update({
          where: { id: syncJob.id },
          data: {
            status: 'synced',
            completedAt: new Date(),
          },
        });

        const response = this.buildSyncResponse(
          { ...existingTracker, serverId },
          requestData,
          userId,
          {
            sessionMappings,
            waypointMappings,
            mediaMapping,
            trackPointCount,
          },
        );

        this.logger.log(`Synced hike ${clientUuid} for user ${userId} revision ${localRevision}`);
        return response;
      } catch (error) {
        const errorMsg = error.message || 'Unknown sync error';

        await db.syncJobRecord.update({
          where: { id: syncJob.id },
          data: {
            status: 'failed',
            error: errorMsg,
          },
        });

        await db.hikeSyncTracker.update({
          where: { id: existingTracker.id },
          data: {
            syncStatus: 'failed',
            lastSyncError: errorMsg,
          },
        });

        throw error;
      }
    } catch (error) {
      this.logger.error('Sync error:', error.message);
      throw error;
    }
  }

  private validateSyncRequest(data: SyncRequestDto) {
    if (!data.clientUuid || typeof data.clientUuid !== 'string') {
      throw new BadRequestException('clientUuid required');
    }
    if (typeof data.localRevision !== 'number' || data.localRevision < 1) {
      throw new BadRequestException('localRevision must be positive integer');
    }
    if (!data.trail) {
      throw new BadRequestException('trail required');
    }
    if (!Array.isArray(data.trackPoints)) {
      throw new BadRequestException('trackPoints must be array');
    }
    if (!Array.isArray(data.waypoints)) {
      throw new BadRequestException('waypoints must be array');
    }
    if (!Array.isArray(data.media)) {
      throw new BadRequestException('media must be array');
    }

    if (data.trackPoints.length > this.MAX_TRACK_POINTS) {
      throw new BadRequestException(`Track points exceed limit of ${this.MAX_TRACK_POINTS}`);
    }
    if (data.waypoints.length > this.MAX_WAYPOINTS) {
      throw new BadRequestException(`Waypoints exceed limit of ${this.MAX_WAYPOINTS}`);
    }
    if (data.media.length > this.MAX_IMAGES) {
      throw new BadRequestException(`Images exceed limit of ${this.MAX_IMAGES}`);
    }
  }

  private async processMediaUploads(
    syncTrackerId: bigint,
    userId: bigint,
    mediaList: any[],
    imageFiles: Map<string, Express.Multer.File> | undefined,
    db: any,
  ): Promise<Map<string, { clientUuid: string; serverMediaId: string; url: string }>> {
    const mediaMapping = new Map();

    if (!imageFiles || imageFiles.size === 0) {
      return mediaMapping;
    }

    for (const media of mediaList) {
      const file = imageFiles.get(media.clientUuid);
      if (!file) continue;

      try {
        const uploadResult = await this.uploadService.uploadHikePhoto(file);

        const mapping = await db.syncMediaMapping.create({
          data: {
            hikeSyncTrackerId: syncTrackerId,
            localPath: file.originalname,
            clientMediaUuid: media.clientUuid,
            serverMediaId: generateId(),
            serverMediaUrl: uploadResult,
            mediaChecksum: media.checksum,
            uploadStatus: 'synced',
            mediaType: media.type,
            waypointClientUuid: media.waypointClientUuid,
          },
        });

        mediaMapping.set(media.clientUuid, {
          clientUuid: media.clientUuid,
          serverMediaId: mapping.serverMediaId,
          url: uploadResult,
        });

        this.logger.debug(`Uploaded media: ${media.clientUuid}`);
      } catch (error) {
        this.logger.warn(`Failed to upload media ${media.clientUuid}: ${error.message}`);
        throw new BadRequestException(`Failed to upload media: ${media.clientUuid}`);
      }
    }

    return mediaMapping;
  }

  private async syncRecordingSessions(
    tracker: any,
    userId: bigint,
    sessions: any[],
    db: any,
  ): Promise<Map<string, { clientUuid: string; serverId: string }>> {
    const sessionMappings = new Map();

    // Get or create a default trail for synced hikes
    let defaultTrail = await db.trail.findFirst({
      where: { slug: 'synced-hikes' },
    });

    if (!defaultTrail) {
      defaultTrail = await db.trail.create({
        data: {
          slug: 'synced-hikes',
          hikeName: 'Synced Hikes',
          description: 'Container for synced hikes',
          activity: 'hiking',
          status: 'draft',
        },
      });
    }

    for (const session of sessions) {
      const hikeSession = await db.hikeSession.create({
        data: {
          trailId: defaultTrail.id,
          userId,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : null,
          status: session.status || 'completed',
        },
      });

      sessionMappings.set(session.clientUuid, {
        clientUuid: session.clientUuid,
        serverId: hikeSession.id,
      });
    }

    return sessionMappings;
  }

  private async syncTrackPoints(
    tracker: any,
    userId: bigint,
    trackPoints: any[],
    sessionMappings: Map<string, any>,
    db: any,
  ): Promise<number> {
    if (trackPoints.length === 0) return 0;

    let sessionId = Array.from(sessionMappings.values())[0]?.serverId;
    if (!sessionId) {
      // Get or create default trail
      let defaultTrail = await db.trail.findFirst({
        where: { slug: 'synced-hikes' },
      });

      if (!defaultTrail) {
        defaultTrail = await db.trail.create({
          data: {
            slug: 'synced-hikes',
            hikeName: 'Synced Hikes',
            description: 'Container for synced hikes',
            activity: 'hiking',
            status: 'draft',
          },
        });
      }

      const session = await db.hikeSession.create({
        data: {
          trailId: defaultTrail.id,
          userId,
          startTime: new Date(trackPoints[0].timestamp),
          status: 'completed',
        },
      });
      sessionId = session.id;
    }

    const points = trackPoints.map((tp: any) => ({
      sessionId,
      latitude: tp.latitude,
      longitude: tp.longitude,
      elevation: tp.altitude || tp.elevation,
      accuracy: tp.accuracy,
      heading: tp.heading,
      speed: tp.speed,
      timestamp: new Date(tp.timestamp),
    }));

    await db.trackPoint.createMany({ data: points });
    return points.length;
  }

  private async syncWaypoints(
    tracker: any,
    userId: bigint,
    waypoints: any[],
    sessionMappings: Map<string, any>,
    mediaMapping: Map<string, any>,
    db: any,
  ): Promise<Map<string, { clientUuid: string; serverId: string }>> {
    const waypointMappings = new Map();

    let sessionId = Array.from(sessionMappings.values())[0]?.serverId;
    if (!sessionId) return waypointMappings;

    // Get or create default trail
    let defaultTrail = await db.trail.findFirst({
      where: { slug: 'synced-hikes' },
    });

    if (!defaultTrail) {
      defaultTrail = await db.trail.create({
        data: {
          slug: 'synced-hikes',
          hikeName: 'Synced Hikes',
          description: 'Container for synced hikes',
          activity: 'hiking',
          status: 'draft',
        },
      });
    }

    for (const wp of waypoints) {
      const waypoint = await db.hikeWaypoint.create({
        data: {
          sessionId,
          trailId: defaultTrail.id,
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
          timestamp: new Date(wp.timestamp),
        },
      });

      waypointMappings.set(wp.clientUuid, {
        clientUuid: wp.clientUuid,
        serverId: waypoint.id,
      });

      // Link photos
      if (wp.photoClientUuids && Array.isArray(wp.photoClientUuids)) {
        for (const photoUuid of wp.photoClientUuids) {
          const photoInfo = mediaMapping.get(photoUuid);
          if (photoInfo) {
            await db.hikeWaypointPhoto.create({
              data: {
                waypointId: waypoint.id,
                userId,
                photoUrl: photoInfo.url,
                latitude: wp.latitude,
                longitude: wp.longitude,
                elevation: wp.elevation,
                timestamp: new Date(),
              },
            });
          }
        }
      }
    }

    return waypointMappings;
  }

  private buildSyncResponse(
    tracker: any,
    requestData: SyncRequestDto,
    userId: bigint,
    extra?: any,
  ): SyncResponseDto {
    return {
      success: true,
      rootServerId: tracker.serverId || '',
      committedServerVersion: tracker.serverVersion || 1,
      acknowledgedLocalRevision: requestData.localRevision,
      clientUuid: tracker.clientUuid,
      sessionMappings: extra?.sessionMappings ? Object.fromEntries(extra.sessionMappings) : {},
      waypointMappings: extra?.waypointMappings ? Object.fromEntries(extra.waypointMappings) : {},
      mediaMappings: extra?.mediaMapping ? Object.fromEntries(extra.mediaMapping) : {},
      trackPointCount: extra?.trackPointCount || 0,
      waypointCount: requestData.waypoints.length,
      imageCount: requestData.media.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

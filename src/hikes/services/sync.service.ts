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
      if (requestData.schemaVersion !== 1) {
        throw new BadRequestException(
          `Unsupported schema version: ${requestData.schemaVersion}`,
        );
      }

      this.validateSyncRequest(requestData);

      const { clientUuid, localRevision } = requestData;
      const db = this.prisma as any;

      // Validate idempotency key
      const [keyClientUuid, keyRevision] = idempotencyKey.split(':');
      if (
        keyClientUuid !== clientUuid ||
        parseInt(keyRevision) !== localRevision
      ) {
        throw new BadRequestException('Idempotency key does not match request');
      }

      // Check for existing job (idempotent retries)
      const existingJob = await db.syncJobRecord
        .findUnique({
          where: { idempotencyKey },
        })
        .catch(() => null);

      if (existingJob && existingJob.completedAt) {
        const tracker = await db.hikeSyncTracker.findUnique({
          where: { id: existingJob.hikeSyncTrackerId },
        });
        this.logger.log(
          `Idempotent retry: returning cached response for ${clientUuid}`,
        );
        return this.buildSyncResponse(tracker, requestData, userId);
      }

      if (existingJob && !existingJob.completedAt) {
        throw new BadRequestException(
          'Sync already in progress for this revision',
        );
      }

      // Check ownership
      let existingTracker = await db.hikeSyncTracker
        .findUnique({
          where: { clientUuid },
        })
        .catch(() => null);

      if (existingTracker && existingTracker.ownerUserId !== userId) {
        throw new ForbiddenException(
          'Cannot upload records belonging to another user',
        );
      }

      // Check for conflicts
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
        // A newer local revision belongs to the same recorded hike. The
        // tracker already owns its server trail, so acknowledge the revision
        // against that identity instead of creating another draft card.
        if (existingTracker.serverId) {
          const serverTrailId = BigInt(existingTracker.serverId);
          const serverTrail = await db.trail.findUnique({
            where: { id: serverTrailId },
          });
          if (serverTrail) {
            const newServerVersion = (existingTracker.serverVersion || 0) + 1;
            const updatedTracker = await db.hikeSyncTracker.update({
              where: { id: existingTracker.id },
              data: {
                localRevision,
                syncedRevision: localRevision,
                serverVersion: newServerVersion,
                syncStatus: 'synced',
                lastSyncedAt: new Date(),
                lastSyncError: null,
              },
            });
            await db.syncJobRecord.update({
              where: { id: syncJob.id },
              data: { status: 'synced', completedAt: new Date() },
            });
            this.logger.log(
              `Synced revision ${localRevision} to existing trail ${serverTrailId}`,
            );
            return this.buildSyncResponse(updatedTracker, requestData, userId);
          }
        }

        // Process media uploads
        const mediaMapping = await this.processMediaUploads(
          existingTracker.id,
          userId,
          requestData.media,
          imageFiles,
          db,
        );

        // Create actual trail entry with synced hike details
        const trailId = await this.createTrailFromSync(requestData.trail, db);

        // Attach uploaded trail images so GET /trails/:id can return them.
        for (const media of requestData.media as any[]) {
          const uploaded = mediaMapping.get(
            media.clientUuid ?? media.clientMediaUuid,
          );
          const type = media.type ?? media.mediaType;
          if (uploaded && ['cover', 'route', 'gallery'].includes(type)) {
            await db.trailMedia.create({
              data: {
                trailId,
                type,
                url: uploaded.url,
                altText: media.caption ?? null,
              },
            });
          }
        }

        // Create sessions linked to the new trail
        const sessionMappings = await this.syncRecordingSessions(
          existingTracker,
          userId,
          requestData.sessions || [],
          db,
          trailId,
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

        // Update tracker to synced with trail ID
        const newServerVersion = (existingTracker.serverVersion || 0) + 1;
        await db.hikeSyncTracker.update({
          where: { id: existingTracker.id },
          data: {
            syncStatus: 'synced',
            syncedRevision: localRevision,
            serverVersion: newServerVersion,
            serverId: trailId.toString(),
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
          { ...existingTracker, serverId: trailId.toString() },
          requestData,
          userId,
          {
            sessionMappings,
            waypointMappings,
            mediaMapping,
            trackPointCount,
          },
        );

        this.logger.log(
          `Synced hike ${clientUuid} for user ${userId} to trail ${trailId}`,
        );
        return response;
      } catch (error) {
        const errorMsg = error.message || 'Unknown sync error';

        await db.syncJobRecord
          .update({
            where: { id: syncJob.id },
            data: {
              status: 'failed',
              error: errorMsg,
            },
          })
          .catch(() => null);

        await db.hikeSyncTracker
          .update({
            where: { id: existingTracker.id },
            data: {
              syncStatus: 'failed',
              lastSyncError: errorMsg,
            },
          })
          .catch(() => null);

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
      throw new BadRequestException(
        `Track points exceed limit of ${this.MAX_TRACK_POINTS}`,
      );
    }
    if (data.waypoints.length > this.MAX_WAYPOINTS) {
      throw new BadRequestException(
        `Waypoints exceed limit of ${this.MAX_WAYPOINTS}`,
      );
    }
    if (data.media.length > this.MAX_IMAGES) {
      throw new BadRequestException(
        `Images exceed limit of ${this.MAX_IMAGES}`,
      );
    }
  }

  private async processMediaUploads(
    syncTrackerId: bigint,
    userId: bigint,
    mediaList: any[],
    imageFiles: Map<string, Express.Multer.File> | undefined,
    db: any,
  ): Promise<
    Map<string, { clientUuid: string; serverMediaId: string; url: string; waypointClientUuid?: string }>
  > {
    const mediaMapping = new Map();

    if (!imageFiles || imageFiles.size === 0) {
      this.logger.debug('No image files provided for media upload');
      return mediaMapping;
    }

    this.logger.debug(`Processing ${mediaList.length} media items with ${imageFiles.size} files`);
    const availableFiles = Array.from(imageFiles.entries()).map(([key, file]) => `${key} (originalname: ${file.originalname})`);
    this.logger.debug(`Available files: ${availableFiles.join(', ')}`);

    for (const original of mediaList) {
      const media = {
        ...original,
        clientUuid: original.clientUuid ?? original.clientMediaUuid,
        type: original.type ?? original.mediaType,
      };
      
      // Try to find file by:
      // 1. Media UUID as key
      // 2. Media UUID as originalname
      // 3. First available file if media UUID is unknown (fallback for legacy clients)
      let file = imageFiles.get(media.clientUuid);
      
      if (!file) {
        // Try to find by checking if any file's originalname matches the UUID
        for (const [, f] of imageFiles.entries()) {
          if (f.originalname === media.clientUuid || f.originalname.includes(media.clientUuid)) {
            file = f;
            break;
          }
        }
      }

      if (!file && mediaList.length === 1 && imageFiles.size === 1) {
        // If there's exactly one media and one file, assume they match (auto-pairing)
        file = Array.from(imageFiles.values())[0];
        this.logger.debug(
          `Auto-paired single media with single file: ${media.clientUuid} -> ${file.originalname}`,
        );
      }

      if (!file) {
        this.logger.warn(
          `No file found for media ${media.clientUuid}. Available files: ${Array.from(imageFiles.keys()).join(', ')}`,
        );
        continue;
      }

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
          waypointClientUuid: media.waypointClientUuid,
        });

        this.logger.debug(
          `Uploaded media: ${media.clientUuid} from file ${file.originalname} (type: ${media.type}, waypointUuid: ${media.waypointClientUuid || 'none'})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to upload media ${media.clientUuid}: ${error.message}`,
        );
        throw new BadRequestException(
          `Failed to upload media: ${media.clientUuid}`,
        );
      }
    }

    this.logger.debug(`Successfully mapped ${mediaMapping.size} media items`);
    return mediaMapping;
  }

  private async createTrailFromSync(trail: any, db: any): Promise<bigint> {
    // Map difficulty to valid enum or null
    const validDifficulties = [
      'easy',
      'easy_to_moderate',
      'moderate',
      'moderate_to_difficult',
      'difficult',
      'expert',
    ];
    const difficulty =
      trail.difficulty && validDifficulties.includes(trail.difficulty)
        ? trail.difficulty
        : null;

    // Map route file type to valid enum
    const validFileTypes = ['gpx', 'kmz', 'kml', 'geojson', 'other'];
    const routeFileType =
      trail.gpxFileType &&
      validFileTypes.includes(trail.gpxFileType.toLowerCase())
        ? trail.gpxFileType.toLowerCase()
        : trail.gpxFilePath
          ? 'gpx'
          : null; // Default to 'gpx' if file path exists but type not specified

    // Extract filename from full path if needed
    let routeFilePath = trail.gpxFilePath;
    if (routeFilePath) {
      // Remove full device path and keep only filename
      routeFilePath = routeFilePath.split('/').pop() || routeFilePath;
    }

    // Parse duration to get label and days
    let durationDays: number | null = null;
    let durationLabel: string | null = null;
    if (trail.duration) {
      if (typeof trail.duration === 'string') {
        durationLabel = trail.duration;
        // Try to parse duration string to extract days (e.g., "1", "1-2", "5-6 hours")
        const match = trail.duration.match(/^(\d+)\s*days?$/i);
        if (match) {
          durationDays = parseInt(match[1]);
        }
      } else {
        durationDays = parseFloat(trail.duration.toString());
        durationLabel = durationDays === 1 ? '1 day' : `${durationDays} days`;
      }
    }

    // Create unique slug by appending clientUuid to avoid duplicates
    const baseSlug = trail.name.toLowerCase().replace(/\s+/g, '-');
    const slug = `${baseSlug}-${trail.clientUuid.substring(0, 8)}`;

    const trailData = {
      slug,
      hikeName: trail.name,
      description: trail.description || '',
      activity: trail.activity || 'hiking',
      difficulty: difficulty,
      difficultyRating: trail.difficultyRating
        ? parseFloat(trail.difficultyRating.toString())
        : null,
      distanceMinKm: trail.distance
        ? parseFloat(trail.distance.toString())
        : null,
      distanceMaxKm: trail.distance
        ? parseFloat(trail.distance.toString())
        : null,
      walkingTimeMinMinutes: trail.walkingTimeMin
        ? parseInt(trail.walkingTimeMin.toString())
        : null,
      walkingTimeMaxMinutes: trail.walkingTimeMax
        ? parseInt(trail.walkingTimeMax.toString())
        : null,
      maxAltitudeM:
        trail.maxAltitudeM != null || trail.maxAltitude != null
          ? Math.round(Number(trail.maxAltitudeM ?? trail.maxAltitude))
          : null,
      durationDays: durationDays,
      durationLabel: durationLabel,
      routeFilePath: routeFilePath,
      routeFileType: routeFileType,
      entryPermitRequired: trail.permitRequired || false,
      fitnessRequirement: trail.fitnessRequirement || null,
      bestTimeNotes: trail.bestTimeNotes || null,
      status: 'draft',
    };

    let newTrail;
    try {
      newTrail = await db.trail.create({
        data: trailData,
      });
    } catch (err: any) {
      // If slug already exists, try with a timestamp
      if (err.code === 'P2002' && err.meta?.target?.includes('slug')) {
        const uniqueSlug = `${baseSlug}-${Date.now()}`;
        newTrail = await db.trail.create({
          data: {
            ...trailData,
            slug: uniqueSlug,
          },
        });
      } else {
        throw err;
      }
    }

    // Add location
    if (trail.region || trail.country) {
      await db.trailLocation
        .create({
          data: {
            trailId: newTrail.id,
            region: trail.region || 'Unknown',
            country: trail.country || 'Unknown',
            distanceFromCityKm: trail.distanceFromCityKm
              ? parseFloat(trail.distanceFromCityKm.toString())
              : null,
            startPoint: trail.startingPoint,
            latitude: trail.latitude,
            longitude: trail.longitude,
          },
        })
        .catch(() => null);
    }

    // Add transportation
    if (trail.transportation) {
      await db.trailTransportation
        .create({
          data: {
            trailId: newTrail.id,
            privateOption: trail.transportation.privateOption,
            publicOption: trail.transportation.publicOption,
            returnOption: trail.transportation.returnOption,
          },
        })
        .catch(() => null);
    }

    // Add highlights
    if (trail.highlights && Array.isArray(trail.highlights)) {
      for (let i = 0; i < trail.highlights.length; i++) {
        await db.trailHighlight
          .create({
            data: {
              trailId: newTrail.id,
              text: trail.highlights[i],
              sortOrder: i,
            },
          })
          .catch(() => null);
      }
    }

    // Add cost items (inclusions)
    if (trail.costIncludes && Array.isArray(trail.costIncludes)) {
      for (let i = 0; i < trail.costIncludes.length; i++) {
        await db.trailCostItem
          .create({
            data: {
              trailId: newTrail.id,
              type: 'included',
              text: trail.costIncludes[i],
              sortOrder: i,
            },
          })
          .catch(() => null);
      }
    }

    // Add cost items (exclusions)
    if (trail.costExcludes && Array.isArray(trail.costExcludes)) {
      for (let i = 0; i < trail.costExcludes.length; i++) {
        await db.trailCostItem
          .create({
            data: {
              trailId: newTrail.id,
              type: 'excluded',
              text: trail.costExcludes[i],
              sortOrder: i,
            },
          })
          .catch(() => null);
      }
    }

    // Add itinerary phases
    if (trail.itinerary && Array.isArray(trail.itinerary)) {
      for (let phaseIdx = 0; phaseIdx < trail.itinerary.length; phaseIdx++) {
        const phaseData = trail.itinerary[phaseIdx];
        try {
          const phase = await db.itineraryPhase.create({
            data: {
              trailId: newTrail.id,
              phaseNumber: phaseIdx + 1,
              title: phaseData.title || `Day ${phaseIdx + 1}`,
              durationLabel: phaseData.durationLabel || null,
              durationMinutes: phaseData.durationMinutes
                ? parseInt(phaseData.durationMinutes.toString())
                : null,
              altitudeM: phaseData.altitudeM
                ? parseInt(phaseData.altitudeM.toString())
                : null,
              sortOrder: phaseIdx,
            },
          });

          // Add phase details/description
          if (phaseData.details && Array.isArray(phaseData.details)) {
            for (
              let detailIdx = 0;
              detailIdx < phaseData.details.length;
              detailIdx++
            ) {
              await db.itineraryPhaseDetail
                .create({
                  data: {
                    phaseId: phase.id,
                    detail: phaseData.details[detailIdx],
                    sortOrder: detailIdx,
                  },
                })
                .catch(() => null);
            }
          }

          // Also support single description field
          if (phaseData.description) {
            await db.itineraryPhaseDetail
              .create({
                data: {
                  phaseId: phase.id,
                  detail: phaseData.description,
                  sortOrder: 0,
                },
              })
              .catch(() => null);
          }
        } catch (err) {
          this.logger.warn(
            `Failed to create itinerary phase ${phaseIdx + 1}: ${err}`,
          );
        }
      }
    }

    this.logger.log(`Created trail ${newTrail.id}: ${trail.name}`);
    return newTrail.id;
  }

  private async syncRecordingSessions(
    tracker: any,
    userId: bigint,
    sessions: any[],
    db: any,
    trailId: bigint,
  ): Promise<Map<string, { clientUuid: string; serverId: string }>> {
    const sessionMappings = new Map();

    // If no sessions provided, create a default one for this sync
    if (!sessions || sessions.length === 0) {
      const hikeSession = await db.hikeSession.create({
        data: {
          trailId,
          userId,
          startTime: new Date(),
          endTime: null,
          status: 'completed',
        },
      });

      sessionMappings.set('default', {
        clientUuid: 'default',
        serverId: hikeSession.id,
      });

      return sessionMappings;
    }

    for (const session of sessions) {
      const hikeSession = await db.hikeSession.create({
        data: {
          trailId,
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
    if (!sessionId) return 0;

    const points = trackPoints.map((tp: any) => {
      // Parse timestamp safely
      let timestamp = new Date();
      if (tp.timestamp) {
        const parsed = new Date(tp.timestamp);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }

      return {
        sessionId,
        latitude: tp.latitude,
        longitude: tp.longitude,
        elevation: tp.altitude ?? tp.elevation,
        accuracy: tp.accuracy,
        heading: tp.heading,
        speed: tp.speed,
        timestamp: timestamp,
      };
    });

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
    const sessionId = Array.from(sessionMappings.values())[0]?.serverId;
    if (!sessionId) return waypointMappings;

    // Get trail from first session
    const session = await db.hikeSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return waypointMappings;

    // Build media lookup maps
    const mediaByUuid = new Map<string, any>();
    const mediaByUrl = new Map<string, any>();
    
    for (const [uuid, info] of mediaMapping.entries()) {
      mediaByUuid.set(uuid, info);
      if (info?.url) {
        mediaByUrl.set(info.url, info);
      }
    }

    this.logger.debug(`Media mapping contains ${mediaByUuid.size} items`);

    // Track which media has been assigned
    const assignedMediaUuids = new Set<string>();
    const unassignedMediaUuids: string[] = [];

    // Build unassigned list
    for (const [uuid] of mediaByUuid.entries()) {
      unassignedMediaUuids.push(uuid);
    }

    let mediaIndex = 0;

    for (const wp of waypoints) {
      // Handle both distanceFromStart and distanceAlong field names
      const distance = wp.distanceFromStart ?? wp.distanceAlong;

      // Collect image URLs for this waypoint from all possible sources
      const imageUrls: string[] = [];
      
      this.logger.debug(`Processing waypoint ${wp.clientUuid} (name: ${wp.name})`);

      // Method 1: Direct photoClientUuids list on waypoint (HIGHEST PRIORITY)
      // Frontend explicitly lists which photos belong to this waypoint
      if (wp.photoClientUuids && Array.isArray(wp.photoClientUuids) && wp.photoClientUuids.length > 0) {
        this.logger.debug(`  Method 1: Found ${wp.photoClientUuids.length} photoClientUuids on waypoint`);
        for (const photoUuid of wp.photoClientUuids) {
          const photoInfo = mediaByUuid.get(photoUuid);
          if (photoInfo?.url) {
            imageUrls.push(photoInfo.url);
            assignedMediaUuids.add(photoUuid);
            this.logger.debug(`    Added photo: ${photoInfo.url}`);
          } else {
            this.logger.warn(`    Photo UUID not found in media mapping: ${photoUuid}`);
          }
        }
      }

      // Method 2: Find media by waypointClientUuid link in mediaMapping
      // Backend matches based on waypoint UUID in media manifest
      if (imageUrls.length === 0) {
        const waypointMediaByLink = Array.from(mediaByUuid.entries())
          .filter(([uuid, media]) => media.waypointClientUuid === wp.clientUuid && !assignedMediaUuids.has(uuid));
        
        if (waypointMediaByLink.length > 0) {
          this.logger.debug(`  Method 2: Found ${waypointMediaByLink.length} media by waypointClientUuid link`);
          for (const [uuid, photoInfo] of waypointMediaByLink) {
            if (photoInfo?.url) {
              imageUrls.push(photoInfo.url);
              assignedMediaUuids.add(uuid);
              this.logger.debug(`    Added photo: ${photoInfo.url}`);
            }
          }
        }
      }

      // Method 3: Sequential assignment from unassigned media
      // If still no images, assign next available media in order
      if (imageUrls.length === 0) {
        while (mediaIndex < unassignedMediaUuids.length) {
          const uuid = unassignedMediaUuids[mediaIndex];
          if (!assignedMediaUuids.has(uuid)) {
            const photoInfo = mediaByUuid.get(uuid);
            if (photoInfo?.url) {
              imageUrls.push(photoInfo.url);
              assignedMediaUuids.add(uuid);
              mediaIndex++;
              this.logger.debug(`  Method 3: Sequential assigned media to waypoint: ${photoInfo.url}`);
              break;
            }
          }
          mediaIndex++;
        }
      }

      // Parse timestamp safely - can be null if parsing fails
      let timestamp: Date | null = null;
      if (wp.timestamp) {
        const parsed = new Date(wp.timestamp);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }

      const waypoint = await db.hikeWaypoint.create({
        data: {
          session: { connect: { id: sessionId } },
          trail: { connect: { id: session.trailId } },
          user: { connect: { id: userId } },
          name: wp.name,
          description: wp.description,
          type: wp.type || 'other',
          latitude: wp.latitude,
          longitude: wp.longitude,
          elevation: wp.elevation,
          facilities: wp.facilities || [],
          conditions: wp.conditions || null,
          distanceFromStart: distance,
          durationAtStart: wp.durationAtStart || null,
          timestamp: timestamp,
        },
      });

      waypointMappings.set(wp.clientUuid, {
        clientUuid: wp.clientUuid,
        serverId: waypoint.id,
      });

      // Also create as POI (PointOfInterest) for the trail with all fields including images
      await db.pointOfInterest.create({
        data: {
          trailId: session.trailId,
          name: wp.name,
          description: wp.description || null,
          latitude: wp.latitude,
          longitude: wp.longitude,
          altitudeM:
            wp.elevation == null ? null : Math.round(Number(wp.elevation)),
          distanceKm: distance,
          type: wp.type || 'other',
          facilities: wp.facilities || [],
          images: imageUrls, // Store image URLs in POI
        },
      });

      // Link photos to waypoint for HikeWaypoint model
      for (const imageUrl of imageUrls) {
        await db.hikeWaypointPhoto.create({
          data: {
            waypointId: waypoint.id,
            userId,
            photoUrl: imageUrl,
            latitude: wp.latitude,
            longitude: wp.longitude,
            elevation: wp.elevation,
            timestamp: timestamp,
          },
        });
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
      sessionMappings: extra?.sessionMappings
        ? Object.fromEntries(extra.sessionMappings)
        : {},
      waypointMappings: extra?.waypointMappings
        ? Object.fromEntries(extra.waypointMappings)
        : {},
      mediaMappings: extra?.mediaMapping
        ? Object.fromEntries(extra.mediaMapping)
        : {},
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

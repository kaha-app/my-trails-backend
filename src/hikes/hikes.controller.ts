import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Request,
  Headers,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { HikesService } from './hikes.service';
import { SyncService } from './services/sync.service';
import { SyncHikeDto } from './dto/sync-hike.dto';
import { SyncRequestDto, SyncResponseDto } from './dto/sync-trail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Hikes')
@Controller('hikes')
export class HikesController {
  constructor(
    private hikesService: HikesService,
    private syncService: SyncService,
    private prisma: PrismaService,
  ) {}

  @Get('synced')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get list of synced hikes' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'List of synced hikes',
    schema: {
      example: {
        data: [
          {
            clientUuid: 'hike-uuid-1',
            syncStatus: 'synced',
            lastSyncedAt: '2026-09-09T12:00:00Z',
            serverVersion: 1,
            serverId: 'server-hike-id',
          },
        ],
        total: 5,
        skip: 0,
        take: 10,
      },
    },
  })
  async getSyncedHikes(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = BigInt(req.user.id);
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 10;

    const db = this.prisma as any;

    const trackers = await db.hikeSyncTracker.findMany({
      where: {
        ownerUserId: userId,
        syncStatus: 'synced',
      },
      skip: skipNum,
      take: takeNum,
      orderBy: { lastSyncedAt: 'desc' },
    });

    const total = await db.hikeSyncTracker.count({
      where: {
        ownerUserId: userId,
        syncStatus: 'synced',
      },
    });

    return {
      data: trackers.map((t: any) => ({
        clientUuid: t.clientUuid,
        syncStatus: t.syncStatus,
        lastSyncedAt: t.lastSyncedAt,
        serverVersion: t.serverVersion,
        serverId: t.serverId,
      })),
      total,
      skip: skipNum,
      take: takeNum,
    };
  }

  @Get('sync-status/:clientUuid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get sync status of a hike' })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved',
    schema: {
      example: {
        clientUuid: 'hike-uuid',
        syncStatus: 'synced',
        lastSyncedAt: '2026-09-09T12:00:00Z',
        serverVersion: 1,
        syncedRevision: 1,
      },
    },
  })
  async getSyncStatus(
    @Request() req: any,
    @Param('clientUuid') clientUuid: string,
  ) {
    const userId = BigInt(req.user.id);
    const db = this.prisma as any;

    const tracker = await db.hikeSyncTracker.findUnique({
      where: { clientUuid },
    });

    if (!tracker) {
      return {
        clientUuid,
        syncStatus: 'not_synced',
        lastSyncedAt: null,
        serverVersion: null,
        syncedRevision: null,
      };
    }

    if (tracker.ownerUserId !== userId) {
      throw new ForbiddenException('Cannot access this hike');
    }

    return {
      clientUuid: tracker.clientUuid,
      syncStatus: tracker.syncStatus,
      lastSyncedAt: tracker.lastSyncedAt,
      serverVersion: tracker.serverVersion,
      syncedRevision: tracker.syncedRevision,
      lastSyncError: tracker.lastSyncError,
    };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileFieldsInterceptor([], {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB total
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sync complete hike with all data and images',
    description: `Upload complete hike snapshot including trail info, recording sessions, track points, waypoints, and images.
    Supports both single-day and multi-day hikes. Repeating sync updates the same record.
    Requires Idempotency-Key header in format: clientUuid:localRevision`,
  })
  @ApiResponse({
    status: 200,
    description: 'Hike synced successfully',
    schema: {
      example: {
        success: true,
        rootServerId: 'server-hike-id',
        committedServerVersion: 1,
        acknowledgedLocalRevision: 3,
        clientUuid: 'stable-hike-uuid',
        sessionMappings: {
          'session-uuid-1': { clientUuid: 'session-uuid-1', serverId: 'session-id' },
        },
        waypointMappings: {
          'waypoint-uuid-1': { clientUuid: 'waypoint-uuid-1', serverId: 'waypoint-id' },
        },
        mediaMappings: {
          'media-uuid-1': { clientUuid: 'media-uuid-1', serverMediaId: 'media-id', url: 'https://...' },
        },
        trackPointCount: 250,
        waypointCount: 5,
        imageCount: 12,
        syncedAt: '2026-09-08T04:54:27.247Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or schema version' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict: server version mismatch' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON string containing complete sync envelope',
        },
      },
      required: ['data'],
    },
  })
  async syncTrail(
    @Request() req: any,
    @Body('data') dataString: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @UploadedFiles() files?: Record<string, Express.Multer.File[]>,
  ): Promise<SyncResponseDto> {
    const userId = BigInt(req.user.id);

    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header required in format: clientUuid:localRevision');
    }

    // Parse request data
    let requestData: SyncRequestDto;
    try {
      requestData = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
    } catch (e) {
      throw new Error('Invalid JSON in data field');
    }

    // Convert files object to Map for easy lookup by media UUID
    const fileMap = new Map<string, Express.Multer.File>();
    if (files) {
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (Array.isArray(fileArray)) {
          for (const file of fileArray) {
            // File names should be media UUIDs
            fileMap.set(file.originalname, file);
          }
        }
      }
    }

    return this.syncService.syncTrail(userId, idempotencyKey, requestData, fileMap);
  }
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'photos', maxCount: 50 }, // Support up to 50 photos
  ], {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Sync offline hike session with photos',
    description: 'Upload complete hike session with track points, waypoints, and photos in one multipart request. Perfect for offline-first recording.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Hike session synced successfully',
    schema: {
      example: {
        success: true,
        sessionId: 'uuid-xxxx',
        trailId: 0,
        userId: 1,
        startTime: '2026-08-19T10:30:00Z',
        endTime: '2026-08-19T14:30:00Z',
        status: 'completed',
        totalDistance: 12.5,
        totalAltitude: 450,
        trackPointsCount: 150,
        waypointsCount: 5,
        photosCount: 10,
        recordedWaypoints: [
          {
            localId: 'wp_001',
            serverId: 456,
            photos: [
              {
                localId: 'photo_001',
                serverId: 789,
                url: '/uploads/hike-photos/photo_001.jpg'
              }
            ]
          }
        ],
        message: 'Hike synced successfully with photos'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid data or photo format' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON string containing hike session data with waypoints that reference photo IDs',
          example: '{"trailId":0,"userId":1,"startTime":"2026-08-19T10:30:00Z",...}'
        },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Photo files from waypoints (up to 50 files, 10MB each)'
        }
      },
      required: ['data']
    }
  })
  async syncHike(
    @Body() body: any,
    @UploadedFiles() files?: { photos?: Express.Multer.File[] }
  ) {
    return this.hikesService.syncHike(body.data, files?.photos);
  }

  @Get('records')
  @ApiOperation({ 
    summary: 'Get recording history',
    description: 'Retrieve all recorded hike sessions with pagination'
  })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to retrieve' })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiQuery({ name: 'trailId', required: false, type: Number, description: 'Filter by trail ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Recording history retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid-1',
            trailId: 0,
            userId: 1,
            startTime: '2026-08-19T10:30:00Z',
            endTime: '2026-08-19T14:30:00Z',
            status: 'completed',
            totalDistance: 12.5,
            totalAltitude: 450,
            trackPointsCount: 150,
            waypointsCount: 5,
            createdAt: '2026-08-19T14:30:00Z'
          }
        ],
        total: 25,
        skip: 0,
        take: 10
      }
    }
  })
  async getRecordingHistory(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('userId') userId?: string,
    @Query('trailId') trailId?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 10;
    const filters: any = {};
    if (userId) filters.userId = BigInt(userId);
    if (trailId) filters.trailId = BigInt(trailId);

    return this.hikesService.getRecordingHistory(skipNum, takeNum, filters);
  }
}

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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { HikesService } from './hikes.service';
import { SyncHikeDto } from './dto/sync-hike.dto';

@ApiTags('Hikes')
@Controller('hikes')
export class HikesController {
  constructor(private hikesService: HikesService) {}

  @Post('sync')
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

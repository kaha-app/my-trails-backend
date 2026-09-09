import {
  Controller,
  Post,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SyncEngineService } from './sync-engine.service';
import { SyncStatusDto, SyncStatsDto } from './dto/sync-hike-response.dto';

@ApiTags('Sync')
@Controller('sync')
@ApiBearerAuth('JWT')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private syncEngine: SyncEngineService) {}

  /**
   * Manual sync trigger endpoint
   * User can call this to manually start sync of pending items
   */
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger sync of offline hikes',
    description: 'Start sync process for all pending items in outbox queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed',
    schema: {
      example: {
        success: true,
        sessionId: 'uuid-xxxx',
        syncedAt: '2024-09-06T10:35:00Z',
        itemsProcessed: 5,
        itemsSucceeded: 4,
        itemsFailed: 1,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: [],
      },
    },
  })
  async manualSync(@Request() req: any) {
    const userId = BigInt(req.user.id);

    try {
      const result = await this.syncEngine.startSync(userId);
      this.logger.log(`Manual sync completed for user ${userId}:`, result);
      return result;
    } catch (error) {
      this.logger.error(`Sync error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status for a specific hike session
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get sync status for a hike session',
    description: 'Returns current sync state, retry count, and last sync attempt',
  })
  @ApiQuery({
    name: 'sessionId',
    description: 'UUID of hike session',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved',
    type: SyncStatusDto,
  })
  async getSyncStatus(
    @Query('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    try {
      const status = await this.syncEngine.getSyncStatus(sessionId);
      return status || {
        sessionId,
        isSynced: false,
        retryCount: 0,
      };
    } catch (error) {
      this.logger.error(`Error getting sync status for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get overall sync statistics for user
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get sync statistics for current user',
    description: 'Returns pending items, retry queue stats, and conflict count',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync statistics retrieved',
    type: SyncStatsDto,
  })
  async getSyncStats(@Request() req: any) {
    const userId = BigInt(req.user.id);

    try {
      const stats = await this.syncEngine.getSyncStats(userId);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting sync stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-sync endpoint (called by mobile app on connectivity change)
   * Returns immediately, processing happens in background
   */
  @Post('auto')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Auto-sync on connectivity restored',
    description: 'Triggered by app when internet connection is restored',
  })
  @ApiResponse({
    status: 202,
    description: 'Sync queued for processing',
  })
  async autoSync(@Request() req: any) {
    const userId = BigInt(req.user.id);

    // Fire and forget - don't wait for sync to complete
    this.syncEngine.startSync(userId).catch((error) => {
      this.logger.error(`Background sync error for user ${userId}:`, error);
    });

    return {
      message: 'Sync initiated',
      status: 'processing',
    };
  }
}

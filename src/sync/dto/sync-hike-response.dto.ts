import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WaypointMapping {
  @ApiProperty({ description: 'Local waypoint identifier' })
  localId: string;

  @ApiProperty({ description: 'Server-assigned waypoint ID' })
  serverId: number;

  @ApiPropertyOptional({ description: 'Photo URL on server' })
  url?: string;
}

class PhotoMapping {
  @ApiProperty({ description: 'Local photo identifier' })
  localId: string;

  @ApiProperty({ description: 'Server-assigned photo ID' })
  serverId: number;

  @ApiProperty({ description: 'Photo URL on server' })
  url: string;
}

export class SyncHikeResponseDto {
  @ApiProperty({ description: 'Sync operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Server session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Trail ID' })
  trailId: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Hike start time' })
  startTime: string;

  @ApiPropertyOptional({ description: 'Hike end time' })
  endTime?: string;

  @ApiProperty({ description: 'Recording status' })
  status: string;

  @ApiPropertyOptional({ description: 'Total distance in km' })
  totalDistance?: number;

  @ApiPropertyOptional({ description: 'Total altitude gain in meters' })
  totalAltitude?: number;

  @ApiProperty({ description: 'Number of track points synced' })
  trackPointsCount: number;

  @ApiProperty({ description: 'Number of waypoints synced' })
  waypointsCount: number;

  @ApiProperty({ description: 'Number of photos synced' })
  photosCount: number;

  @ApiPropertyOptional({ description: 'Local to server waypoint ID mappings' })
  recordedWaypoints?: WaypointMapping[];

  @ApiPropertyOptional({ description: 'Sync status information' })
  syncStatus?: {
    isSynced: boolean;
    lastSyncAttempt: string;
    lastSyncSuccess?: string;
    retryCount: number;
  };

  @ApiPropertyOptional({ description: 'Any errors encountered during sync' })
  errors?: string[];
}

export class SyncStatusDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Whether hike is fully synced' })
  isSynced: boolean;

  @ApiPropertyOptional({ description: 'Last sync attempt timestamp' })
  lastSyncAttempt?: string;

  @ApiPropertyOptional({ description: 'Last successful sync timestamp' })
  lastSyncSuccess?: string;

  @ApiProperty({ description: 'Number of retry attempts' })
  retryCount: number;

  @ApiPropertyOptional({ description: 'Reason for sync failure if any' })
  syncFailureReason?: string;
}

export class SyncStatsDto {
  @ApiProperty({ description: 'Number of pending items in outbox' })
  pendingItems: number;

  @ApiProperty({ description: 'Retry queue statistics' })
  retryQueue: {
    totalRetries: number;
    readyNow: number;
    maxedOut: number;
  };

  @ApiProperty({ description: 'Number of pending conflicts' })
  conflicts: number;
}

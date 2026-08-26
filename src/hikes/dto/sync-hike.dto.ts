import { IsNumber, IsArray, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncTrackPointDto {
  @ApiProperty({ example: 27.6735, description: 'GPS latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 85.3125, description: 'GPS longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 1250.5, description: 'Altitude in meters' })
  @IsNumber()
  altitude: number;

  @ApiProperty({ example: '2026-08-19T10:30:00Z', description: 'ISO 8601 timestamp' })
  @IsISO8601()
  timestamp: string;

  @ApiPropertyOptional({ example: 4.5, description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

export class SyncWaypointDto {
  @ApiProperty({ example: 'Peak View', description: 'Waypoint name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Amazing view', description: 'Waypoint description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'viewpoint', enum: ['viewpoint', 'restArea', 'waterSource', 'campsite', 'landmark', 'danger', 'parking', 'trailhead', 'junction', 'shelter', 'bridge', 'summit', 'other'] })
  @IsString()
  type: string;

  @ApiProperty({ example: 27.6997, description: 'GPS latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 85.3283, description: 'GPS longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 1250.3, description: 'Altitude in meters' })
  @IsOptional()
  @IsNumber()
  elevation?: number;

  @ApiProperty({ example: '2026-08-19T11:15:00Z', description: 'ISO 8601 timestamp' })
  @IsISO8601()
  timestamp: string;

  @ApiPropertyOptional({ example: 5.2, description: 'Distance from hike start in km' })
  @IsOptional()
  @IsNumber()
  distanceFromStart?: number;

  @ApiPropertyOptional({ example: ['water', 'restroom'], description: 'Available facilities' })
  @IsOptional()
  @IsArray()
  facilities?: string[];
}

export class SyncHikeDto {
  @ApiProperty({ example: 1, description: 'Trail ID (0 for offline/local hikes)' })
  @IsNumber()
  trailId: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: '2026-08-19T10:30:00Z', description: 'ISO 8601 start timestamp' })
  @IsISO8601()
  startTime: string;

  @ApiPropertyOptional({ example: '2026-08-19T14:30:00Z', description: 'ISO 8601 end timestamp' })
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @ApiPropertyOptional({ example: 'completed', enum: ['active', 'paused', 'completed', 'abandoned'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ type: [SyncTrackPointDto], description: 'Array of GPS track points' })
  @IsArray()
  trackPoints: SyncTrackPointDto[];

  @ApiProperty({ type: [SyncWaypointDto], description: 'Array of waypoints with POI' })
  @IsArray()
  waypoints: SyncWaypointDto[];

  @ApiPropertyOptional({ example: 'Great hike with amazing views', description: 'Hike summary/notes' })
  @IsOptional()
  @IsString()
  summary?: string;
}

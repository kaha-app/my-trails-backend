import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsISO8601,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum HikePoiType {
  VIEWPOINT = 'viewpoint',
  REST_AREA = 'restArea',
  WATER_SOURCE = 'waterSource',
  CAMPSITE = 'campsite',
  LANDMARK = 'landmark',
  DANGER = 'danger',
  PARKING = 'parking',
  TRAILHEAD = 'trailhead',
  JUNCTION = 'junction',
  SHELTER = 'shelter',
  BRIDGE = 'bridge',
  SUMMIT = 'summit',
  OTHER = 'other',
}

export class AddWaypointDto {
  @ApiPropertyOptional({ example: 'Mountain Peak Vista', description: 'Waypoint name (max 50 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: 'Amazing 360-degree view',
    description: 'Notes/description (max 200 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({
    enum: Object.values(HikePoiType),
    example: 'viewpoint',
    description: 'POI type',
  })
  @IsEnum(HikePoiType)
  type: HikePoiType;

  @ApiProperty({ example: 27.7172, description: 'GPS latitude' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 85.324, description: 'GPS longitude' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: 2732, description: 'Altitude in meters' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  elevation?: number;

  @ApiPropertyOptional({
    example: ['restrooms', 'food'],
    description: 'Available facilities',
  })
  @IsOptional()
  @IsArray()
  facilities?: string[];

  @ApiPropertyOptional({
    example: 'Clear sky, 15°C',
    description: 'Trail/weather conditions (max 150 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  conditions?: string;

  @ApiProperty({
    example: '2026-08-19T11:15:00Z',
    description: 'ISO 8601 timestamp when waypoint was created',
  })
  @IsISO8601()
  timestamp: string;

  @ApiPropertyOptional({
    example: 5.2,
    description: 'Distance from hike start in km',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  distanceFromStart?: number;

  @ApiPropertyOptional({
    example: '00:45:30',
    description: 'Duration at start time',
  })
  @IsOptional()
  @IsString()
  durationAtStart?: string;
}

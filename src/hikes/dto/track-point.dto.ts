import { IsNumber, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TrackPointDto {
  @ApiProperty({ example: 27.7172, description: 'GPS latitude' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 85.324, description: 'GPS longitude' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: 2500, description: 'Elevation in meters' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  elevation?: number;

  @ApiPropertyOptional({ example: 10, description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracy?: number;

  @ApiPropertyOptional({ example: 45, description: 'Heading in degrees' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heading?: number;

  @ApiPropertyOptional({ example: 3.5, description: 'Speed in km/h' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  speed?: number;

  @ApiProperty({
    example: '2026-08-19T10:35:00Z',
    description: 'ISO 8601 timestamp',
  })
  @IsISO8601()
  timestamp: string;

  @ApiPropertyOptional({
    example: 0.15,
    description: 'Distance since last point in km',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  distanceSinceLastPoint?: number;
}

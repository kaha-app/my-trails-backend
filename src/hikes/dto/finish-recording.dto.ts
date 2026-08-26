import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FinishRecordingDto {
  @ApiProperty({
    example: '2026-08-19T14:30:00Z',
    description: 'ISO 8601 end timestamp',
  })
  @IsISO8601()
  endTime: string;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Total distance in km',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalDistance?: number;

  @ApiPropertyOptional({
    example: 850,
    description: 'Total altitude gain in meters',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalAltitude?: number;

  @ApiPropertyOptional({
    example: 2850,
    description: 'Maximum altitude reached in meters',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAltitude?: number;

  @ApiPropertyOptional({
    example: 1980,
    description: 'Minimum altitude reached in meters',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAltitude?: number;

  @ApiPropertyOptional({
    example: 'Great hike! Weather was perfect.',
    description: 'Summary of the hike',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}

import { Type, Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum DifficultyLevel {
  easy = 'easy',
  easy_to_moderate = 'easy_to_moderate',
  moderate = 'moderate',
  moderate_to_difficult = 'moderate_to_difficult',
  difficult = 'difficult',
  expert = 'expert',
}

enum ActivityType {
  hiking = 'hiking',
  trekking = 'trekking',
  walking = 'walking',
  trail_running = 'trail_running',
  sightseeing = 'sightseeing',
  other = 'other',
}

// Simple Trail Creation DTO - Only basic trail info
export class CreateTrailDto {
  @ApiProperty({ example: 'shivapuri-day-hike', description: 'URL slug (must be unique)' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Shivapuri Day Hike', description: 'Trail name' })
  @IsString()
  hikeName: string;

  @ApiProperty({ example: 'Shivapuri Day Hiking is a perfect day Hiking...', description: 'Trail description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 2732, description: 'Maximum altitude in meters' })
  @IsOptional()
  @Type(() => Number)
  maxAltitudeM?: number;

  @ApiPropertyOptional({ example: '1 Day', description: 'Duration label' })
  @IsOptional()
  @IsString()
  durationLabel?: string;

  @ApiPropertyOptional({ example: 1, description: 'Duration in days' })
  @IsOptional()
  @Type(() => Number)
  durationDays?: number;

  @ApiPropertyOptional({ enum: DifficultyLevel, example: 'moderate', description: 'Difficulty level' })
  @IsOptional()
  @Transform(({ value }) => {
    // Convert "hard" to "difficult" for backward compatibility
    return value === 'hard' ? 'difficult' : value;
  })
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ example: 'Moderate', description: 'Difficulty label' })
  @IsOptional()
  @IsString()
  difficultyLabel?: string;

  @ApiPropertyOptional({ example: 3.5, description: 'Difficulty rating (1-5)' })
  @IsOptional()
  @Type(() => Number)
  difficultyRating?: number;

  @ApiPropertyOptional({ enum: ActivityType, example: 'hiking', description: 'Type of activity' })
  @IsOptional()
  @IsEnum(ActivityType)
  activity?: ActivityType;

  @ApiPropertyOptional({ example: 18, description: 'Minimum distance in km' })
  @IsOptional()
  @Type(() => Number)
  distanceMinKm?: number;

  @ApiPropertyOptional({ example: 18, description: 'Maximum distance in km' })
  @IsOptional()
  @Type(() => Number)
  distanceMaxKm?: number;

  @ApiPropertyOptional({ example: 360, description: 'Minimum walking time in minutes' })
  @IsOptional()
  @Type(() => Number)
  walkingTimeMinMinutes?: number;

  @ApiPropertyOptional({ example: 420, description: 'Maximum walking time in minutes' })
  @IsOptional()
  @Type(() => Number)
  walkingTimeMaxMinutes?: number;

  @ApiPropertyOptional({ example: 12, description: 'Group size limit' })
  @IsOptional()
  @Type(() => Number)
  groupSizeLimit?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether entry permit is required' })
  @IsOptional()
  @IsBoolean()
  entryPermitRequired?: boolean;

  @ApiPropertyOptional({ description: 'Fitness level requirement' })
  @IsOptional()
  @IsString()
  fitnessRequirement?: string;

  @ApiPropertyOptional({ example: 'Best visited during dry season', description: 'Best time to visit notes' })
  @IsOptional()
  @IsString()
  bestTimeNotes?: string;

  @ApiPropertyOptional({ example: 'Shivapuri Nagarjun National Park, Kathmandu Valley', description: 'Region or area name' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Nepal', description: 'Country name' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '/uploads/gpx/trail-route.gpx', description: 'GPX file path from upload-gpx endpoint' })
  @IsOptional()
  @IsString()
  gpxFilePath?: string;
}

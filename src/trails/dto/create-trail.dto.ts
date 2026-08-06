import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

export class CreateTrailDto {
  @ApiProperty({ example: 'mount-kilimanjaro', description: 'URL slug (must be unique)' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Mount Kilimanjaro', description: 'Trail name' })
  @IsString()
  hikeName: string;

  @ApiProperty({ example: 'A challenging trek to Africa highest peak', description: 'Trail description' })
  @IsString()
  description: string;

  @ApiProperty({ required: false, description: 'Path to route file' })
  @IsOptional()
  @IsString()
  routeFilePath?: string;

  @ApiProperty({ required: false, example: 5895, description: 'Maximum altitude in meters' })
  @IsOptional()
  @IsNumber()
  maxAltitudeM?: number;

  @ApiProperty({ required: false, example: '5-6 days', description: 'Duration label' })
  @IsOptional()
  @IsString()
  durationLabel?: string;

  @ApiProperty({ required: false, example: 5.5, description: 'Duration in days' })
  @IsOptional()
  @Type(() => Number)
  durationDays?: number;

  @ApiProperty({ required: false, enum: DifficultyLevel, description: 'Difficulty level' })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ required: false, description: 'Difficulty label' })
  @IsOptional()
  @IsString()
  difficultyLabel?: string;

  @ApiProperty({ required: false, example: 4.5, description: 'Difficulty rating (1-5)' })
  @IsOptional()
  @Type(() => Number)
  difficultyRating?: number;

  @ApiProperty({ required: false, enum: ActivityType, description: 'Type of activity' })
  @IsOptional()
  @IsEnum(ActivityType)
  activity?: ActivityType;

  @ApiProperty({ required: false, example: 50, description: 'Minimum distance in km' })
  @IsOptional()
  @Type(() => Number)
  distanceMinKm?: number;

  @ApiProperty({ required: false, example: 65, description: 'Maximum distance in km' })
  @IsOptional()
  @Type(() => Number)
  distanceMaxKm?: number;

  @ApiProperty({ required: false, example: 480, description: 'Minimum walking time in minutes' })
  @IsOptional()
  @IsNumber()
  walkingTimeMinMinutes?: number;

  @ApiProperty({ required: false, example: 600, description: 'Maximum walking time in minutes' })
  @IsOptional()
  @IsNumber()
  walkingTimeMaxMinutes?: number;

  @ApiProperty({ required: false, example: 12, description: 'Group size limit' })
  @IsOptional()
  @IsNumber()
  groupSizeLimit?: number;

  @ApiProperty({ required: false, example: true, description: 'Whether entry permit is required' })
  @IsOptional()
  @IsBoolean()
  entryPermitRequired?: boolean;

  @ApiProperty({ required: false, description: 'Fitness level requirement' })
  @IsOptional()
  @IsString()
  fitnessRequirement?: string;

  @ApiProperty({ required: false, example: 'Best visited during dry season', description: 'Best time to visit notes' })
  @IsOptional()
  @IsString()
  bestTimeNotes?: string;
}

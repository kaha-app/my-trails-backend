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

export class UpdateTrailDto {
  @ApiProperty({ 
    example: 'mount-kilimanjaro-updated', 
    description: 'URL slug (unique, optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ 
    example: 'Mount Kilimanjaro - Updated', 
    description: 'Trail name (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  hikeName?: string;

  @ApiProperty({ 
    example: 'Updated description of the trail', 
    description: 'Trail description (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Path to route file (optional)' 
  })
  @IsOptional()
  @IsString()
  routeFilePath?: string;

  @ApiProperty({ 
    required: false, 
    example: 5895, 
    description: 'Maximum altitude in meters (optional)' 
  })
  @IsOptional()
  @IsNumber()
  maxAltitudeM?: number;

  @ApiProperty({ 
    required: false, 
    example: '6 days', 
    description: 'Duration label (optional)' 
  })
  @IsOptional()
  @IsString()
  durationLabel?: string;

  @ApiProperty({ 
    required: false, 
    example: 6, 
    description: 'Duration in days (optional)' 
  })
  @IsOptional()
  @Type(() => Number)
  durationDays?: number;

  @ApiProperty({ 
    required: false, 
    enum: DifficultyLevel, 
    description: 'Difficulty level (optional)' 
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ 
    required: false, 
    example: 'Very Difficult', 
    description: 'Difficulty label (optional)' 
  })
  @IsOptional()
  @IsString()
  difficultyLabel?: string;

  @ApiProperty({ 
    required: false, 
    example: 4.8, 
    description: 'Difficulty rating 1-5 (optional)' 
  })
  @IsOptional()
  @Type(() => Number)
  difficultyRating?: number;

  @ApiProperty({ 
    required: false, 
    enum: ActivityType, 
    description: 'Type of activity (optional)' 
  })
  @IsOptional()
  @IsEnum(ActivityType)
  activity?: ActivityType;

  @ApiProperty({ 
    required: false, 
    example: 48, 
    description: 'Minimum distance in km (optional)' 
  })
  @IsOptional()
  @Type(() => Number)
  distanceMinKm?: number;

  @ApiProperty({ 
    required: false, 
    example: 65, 
    description: 'Maximum distance in km (optional)' 
  })
  @IsOptional()
  @Type(() => Number)
  distanceMaxKm?: number;

  @ApiProperty({ 
    required: false, 
    example: 480, 
    description: 'Minimum walking time in minutes (optional)' 
  })
  @IsOptional()
  @IsNumber()
  walkingTimeMinMinutes?: number;

  @ApiProperty({ 
    required: false, 
    example: 600, 
    description: 'Maximum walking time in minutes (optional)' 
  })
  @IsOptional()
  @IsNumber()
  walkingTimeMaxMinutes?: number;

  @ApiProperty({ 
    required: false, 
    example: 15, 
    description: 'Group size limit (optional)' 
  })
  @IsOptional()
  @IsNumber()
  groupSizeLimit?: number;

  @ApiProperty({ 
    required: false, 
    example: true, 
    description: 'Whether entry permit is required (optional)' 
  })
  @IsOptional()
  @IsBoolean()
  entryPermitRequired?: boolean;

  @ApiProperty({ 
    required: false, 
    example: 'Advanced fitness required', 
    description: 'Fitness level requirement (optional)' 
  })
  @IsOptional()
  @IsString()
  fitnessRequirement?: string;

  @ApiProperty({ 
    required: false, 
    example: 'Best visited June to October', 
    description: 'Best time to visit notes (optional)' 
  })
  @IsOptional()
  @IsString()
  bestTimeNotes?: string;
}

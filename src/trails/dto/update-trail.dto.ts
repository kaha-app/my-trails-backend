import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
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

class UpdateTrailLocationDto {
  @ApiProperty({ required: false, example: 'Pharping, Kathmandu Valley' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false, example: 'Nepal' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, example: 'Pharping' })
  @IsOptional()
  @IsString()
  startPoint?: string;

  @ApiProperty({ required: false, example: 'Kritipur' })
  @IsOptional()
  @IsString()
  endPoint?: string;

  @ApiProperty({ required: false, example: '20' })
  @IsOptional()
  @IsString()
  distanceFromCityKm?: string;

  @ApiProperty({ required: false, example: '27.6735' })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiProperty({ required: false, example: '85.3125' })
  @IsOptional()
  @IsString()
  longitude?: string;
}

class UpdateTrailTransportationDto {
  @ApiProperty({ required: false, example: 'Taxi or private vehicle from hotel (30-40 minutes)' })
  @IsOptional()
  @IsString()
  privateOption?: string;

  @ApiProperty({ required: false, example: 'Local bus from city center (40 minutes)' })
  @IsOptional()
  @IsString()
  publicOption?: string;

  @ApiProperty({ required: false, example: 'Local bus back to city (every 30 minutes)' })
  @IsOptional()
  @IsString()
  returnOption?: string;
}

class HighlightDto {
  @ApiProperty({ example: 'Stunning mountain views' })
  @IsString()
  text: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class PointOfInterestDto {
  @ApiProperty({ example: 'Hattiban Resort' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'A hillside resort...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '1.2' })
  @IsOptional()
  @IsString()
  distanceKm?: string;

  @ApiProperty({ required: false, example: 'lodge' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false, example: 2100 })
  @IsOptional()
  @IsNumber()
  altitudeM?: number;

  @ApiProperty({ required: false, example: ['https://images.unsplash.com/...'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false, example: ['Drinking water', 'Tea house'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class CostItemDto {
  @ApiProperty({ enum: ['included', 'excluded'], example: 'included' })
  @IsEnum(['included', 'excluded'])
  type: string;

  @ApiProperty({ example: 'Champadevi Entry Permit' })
  @IsString()
  text: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class RecommendedSeasonDto {
  @ApiProperty({ example: 'Spring' })
  @IsString()
  season: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class AvoidedMonthDto {
  @ApiProperty({ example: 'June' })
  @IsString()
  monthLabel: string;

  @ApiProperty({ required: false, example: 6 })
  @IsOptional()
  @IsNumber()
  monthNumber?: number;

  @ApiProperty({ required: false, example: 'Heavy monsoon rains' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class SafetyItemDto {
  @ApiProperty({ enum: ['precaution', 'required_gear'], example: 'precaution' })
  @IsEnum(['precaution', 'required_gear'])
  type: string;

  @ApiProperty({ example: 'Bring plenty of water' })
  @IsString()
  text: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
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
    example: 'gpx',
    description: 'Route file type (optional)'
  })
  @IsOptional()
  @IsString()
  routeFileType?: string;

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

  @ApiProperty({
    required: false,
    type: UpdateTrailLocationDto,
    description: 'Trail location details (optional)'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTrailLocationDto)
  location?: UpdateTrailLocationDto;

  @ApiProperty({
    required: false,
    type: UpdateTrailTransportationDto,
    description: 'Transportation options (optional)'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTrailTransportationDto)
  transportation?: UpdateTrailTransportationDto;

  @ApiProperty({
    required: false,
    type: [HighlightDto],
    description: 'Trail highlights (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightDto)
  highlights?: HighlightDto[];

  @ApiProperty({
    required: false,
    type: [PointOfInterestDto],
    description: 'Points of interest (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointOfInterestDto)
  pointsOfInterest?: PointOfInterestDto[];

  @ApiProperty({
    required: false,
    type: [CostItemDto],
    description: 'Cost items (included/excluded) (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostItemDto)
  costItems?: CostItemDto[];

  @ApiProperty({
    required: false,
    type: [RecommendedSeasonDto],
    description: 'Recommended seasons (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedSeasonDto)
  recommendedSeasons?: RecommendedSeasonDto[];

  @ApiProperty({
    required: false,
    type: [AvoidedMonthDto],
    description: 'Months to avoid (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvoidedMonthDto)
  avoidedMonths?: AvoidedMonthDto[];

  @ApiProperty({
    required: false,
    type: [SafetyItemDto],
    description: 'Safety items and precautions (optional)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyItemDto)
  safetyItems?: SafetyItemDto[];
}

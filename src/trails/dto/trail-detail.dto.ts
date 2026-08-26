import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrailLocationDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '6' })
  trailId: string;

  @ApiProperty({ example: 'Pharping, Kathmandu Valley' })
  region: string;

  @ApiProperty({ example: 'Nepal' })
  country: string;

  @ApiPropertyOptional({ example: 'Pharping' })
  startPoint?: string;

  @ApiPropertyOptional({ example: 'Hattiban' })
  endPoint?: string;

  @ApiPropertyOptional({ example: '20' })
  distanceFromCityKm?: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;
}

export class TrailTransportationDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: 'Taxi or private vehicle from hotel to Pharping Bhanjyang (30-40 minutes)' })
  privateOption?: string;

  @ApiPropertyOptional({ example: 'Local bus from Ratnapark/RNAC to Pharping Bhanjyang (40 minutes)' })
  publicOption?: string;

  @ApiPropertyOptional({ example: 'Local bus from Bhanjyang to Ratnapark (every 30 minutes)' })
  returnOption?: string;
}

export class TrailRatingBreakdownDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '5' })
  ratingSummaryId: string;

  @ApiProperty({ example: 5, description: 'Number of stars' })
  stars: number;

  @ApiProperty({ example: 40, description: 'Count or percentage' })
  value: number;
}

export class TrailRatingSummaryDto {
  @ApiProperty({ example: '5' })
  id: string;

  @ApiProperty({ example: '6' })
  trailId: string;

  @ApiProperty({ example: '4.2' })
  average: string;

  @ApiProperty({ example: 87 })
  reviewCount: number;

  @ApiProperty({ example: 'count' })
  breakdownType: string;

  @ApiProperty({ type: [TrailRatingBreakdownDto] })
  breakdowns: TrailRatingBreakdownDto[];
}

export class ItineraryPhaseDetailDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Drive 30-40 minutes to Pharping Bhanjyang' })
  detail: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class ItineraryPhaseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 1 })
  phaseNumber: number;

  @ApiProperty({ example: 'Hotel to Pharping Bhanjyang & Hike to Hattiban Resort' })
  title: string;

  @ApiPropertyOptional({ example: '1 hour approx' })
  durationLabel?: string;

  @ApiPropertyOptional({ example: 60 })
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 2100 })
  altitudeM?: number;

  @ApiProperty({ type: [ItineraryPhaseDetailDto] })
  details: ItineraryPhaseDetailDto[];
}

export class TrailHighlightDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Stunning mountain panoramas from Langtang and Ganesh Himal to Annapurna ranges' })
  text: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class PointOfInterestDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Hattiban Resort' })
  name: string;

  @ApiPropertyOptional({ example: 'A hillside resort...' })
  description?: string;

  @ApiPropertyOptional({ example: '1.2' })
  distanceKm?: string;

  @ApiPropertyOptional({ example: 'lodge' })
  icon?: string;

  @ApiPropertyOptional({ example: 2100 })
  altitudeM?: number;

  @ApiProperty({ example: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4'] })
  images: string[];

  @ApiProperty({ example: ['Drinking water', 'Tea house / restaurant', 'Toilet'] })
  facilities: string[];

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class TrailCostItemDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'included' })
  type: string;

  @ApiProperty({ example: 'Champadevi Entry Permit' })
  text: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class TrailRecommendedSeasonDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Spring' })
  season: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class TrailAvoidedMonthDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: 6 })
  monthNumber?: number;

  @ApiProperty({ example: 'June' })
  monthLabel: string;

  @ApiPropertyOptional({ example: 'Heavy monsoon rains' })
  reason?: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class TrailSafetyItemDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'precaution' })
  type: string;

  @ApiProperty({ example: 'Bring plenty of water' })
  text: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class TrailMediaDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'cover' })
  type: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' })
  url: string;

  @ApiPropertyOptional()
  altText?: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class TrailDetailDto {
  @ApiProperty({ example: '6' })
  id: string;

  @ApiProperty({ example: 'champadevi-hike' })
  slug: string;

  @ApiProperty({ example: 'Champadevi Hike' })
  hikeName: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ example: 'assets/gpx/champadevi-temple.gpx' })
  routeFilePath?: string;

  @ApiPropertyOptional({ example: 'gpx' })
  routeFileType?: string;

  @ApiPropertyOptional({ example: 2278 })
  maxAltitudeM?: number;

  @ApiPropertyOptional({ example: '1 Day' })
  durationLabel?: string;

  @ApiPropertyOptional({ example: '1' })
  durationDays?: string;

  @ApiPropertyOptional({ example: 'easy_to_moderate' })
  difficulty?: string;

  @ApiPropertyOptional({ example: 'Easy to Moderate' })
  difficultyLabel?: string;

  @ApiPropertyOptional({ example: '3.2' })
  difficultyRating?: string;

  @ApiProperty({ example: 'hiking' })
  activity: string;

  @ApiPropertyOptional({ example: '8' })
  distanceMinKm?: string;

  @ApiPropertyOptional({ example: '10' })
  distanceMaxKm?: string;

  @ApiPropertyOptional({ example: 240 })
  walkingTimeMinMinutes?: number;

  @ApiPropertyOptional({ example: 300 })
  walkingTimeMaxMinutes?: number;

  @ApiPropertyOptional()
  groupSizeLimit?: number;

  @ApiProperty({ example: false })
  entryPermitRequired: boolean;

  @ApiPropertyOptional()
  fitnessRequirement?: string;

  @ApiPropertyOptional()
  bestTimeNotes?: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional()
  sourceUpdatedAt?: string;

  @ApiPropertyOptional()
  publishedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  deletedAt?: string;

  @ApiProperty({ type: TrailLocationDto })
  location: TrailLocationDto;

  @ApiProperty({ type: TrailTransportationDto })
  transportation?: TrailTransportationDto;

  @ApiProperty({ type: TrailRatingSummaryDto })
  ratingSummary: TrailRatingSummaryDto;

  @ApiProperty({ type: [ItineraryPhaseDto] })
  itineraryPhases: ItineraryPhaseDto[];

  @ApiProperty({ type: [TrailHighlightDto] })
  highlights: TrailHighlightDto[];

  @ApiProperty({ type: [PointOfInterestDto] })
  pointsOfInterest: PointOfInterestDto[];

  @ApiProperty({ type: [TrailCostItemDto] })
  costItems: TrailCostItemDto[];

  @ApiProperty({ type: [TrailMediaDto] })
  media: TrailMediaDto[];

  @ApiPropertyOptional({ type: TrailMediaDto, description: 'Cover photo for the trail (convenience field, also in media array)' })
  coverPhoto?: TrailMediaDto;

  @ApiProperty({ type: [TrailRecommendedSeasonDto] })
  recommendedSeasons: TrailRecommendedSeasonDto[];

  @ApiProperty({ type: [TrailAvoidedMonthDto] })
  avoidedMonths: TrailAvoidedMonthDto[];

  @ApiProperty({ type: [TrailSafetyItemDto] })
  safetyItems: TrailSafetyItemDto[];
}

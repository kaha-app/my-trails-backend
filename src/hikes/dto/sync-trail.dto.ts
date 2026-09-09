export class SyncTrackPointDto {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string; // ISO-8601
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export class SyncWaypointDto {
  clientUuid: string;
  name?: string;
  description?: string;
  type: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  distanceFromStart?: number;
  durationAtStart?: string;
  timestamp: string; // ISO-8601
  createdTime?: string;
  facilities?: string[];
  conditions?: string;
  photoClientUuids?: string[];
}

export class SyncRecordingSessionDto {
  clientUuid: string;
  dayNumber?: number;
  startTime: string; // ISO-8601
  endTime?: string;
  status: string;
  distance?: number;
  duration?: number; // seconds
  maxElevation?: number;
  multiDayGroupUuid?: string;
}

export class SyncMediaDto {
  clientUuid: string;
  type: 'cover' | 'route' | 'gallery' | 'poi'; // cover, route image, gallery, POI photo
  waypointClientUuid?: string;
  createdTime: string; // ISO-8601
  checksum?: string;
}

export class SyncTrailDto {
  clientUuid: string;
  name: string;
  region: string;
  country: string;
  distanceFromCityKm?: number;
  startingPoint?: string;
  difficulty?: string;
  difficultyRating?: number;
  distance?: number; // km
  walkingTimeMin?: number; // minutes
  walkingTimeMax?: number; // minutes
  activity?: string;
  groupSize?: number;
  maxAltitude?: number; // meters
  duration?: string; // days
  description?: string;
  transportation?: {
    privateOption?: string;
    publicOption?: string;
    returnOption?: string;
  };
  permitRequired?: boolean;
  recordedAt: string; // ISO-8601
}

export class SyncMultiDayHikeDto {
  clientUuid: string;
  name: string;
  description?: string;
  status: string;
  createdTime: string;
  updatedTime: string;
}

export class SyncRequestDto {
  schemaVersion: number; // 1
  clientUuid: string; // Permanent hike UUID
  localRevision: number; // Current revision
  baseServerVersion?: number; // For conflict detection
  trail: SyncTrailDto;
  relatedTrails?: SyncTrailDto[]; // For multi-day
  multiDayHike?: SyncMultiDayHikeDto;
  sessions?: SyncRecordingSessionDto[]; // Recording sessions for multi-day
  trackPoints: SyncTrackPointDto[];
  waypoints: SyncWaypointDto[];
  media: SyncMediaDto[];
}

export class SyncResponseDto {
  success: boolean;
  rootServerId: string;
  committedServerVersion: number;
  acknowledgedLocalRevision: number;
  clientUuid: string;
  
  // Mappings
  relatedTrailMappings?: Record<string, { clientUuid: string; serverId: string }>;
  sessionMappings?: Record<string, { clientUuid: string; serverId: string }>;
  mediaMappings?: Record<string, { clientUuid: string; serverMediaId: string; url: string }>;
  waypointMappings?: Record<string, { clientUuid: string; serverId: string }>;
  
  trackPointCount: number;
  waypointCount: number;
  imageCount: number;
  syncedAt: string;
  
  error?: string;
  code?: string;
}

// Sync Models and Types for Offline-First Architecture

export interface SyncPayload {
  sessionId: string;
  userId: bigint;
  trackPoints: TrackPointData[];
  waypoints: HikeWaypointData[];
  hikeSummary: HikeSummaryData;
}

export interface TrackPointData {
  latitude: number;
  longitude: number;
  elevation?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  distanceSinceLastPoint?: number;
}

export interface HikeWaypointData {
  localId: string;
  name?: string;
  description?: string;
  type: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  facilities?: string[];
  conditions?: string;
  distanceFromStart?: number;
  timestamp: string;
}

export interface HikeSummaryData {
  sessionId: string;
  trailId: bigint;
  userId: bigint;
  startTime: string;
  endTime: string;
  status: string;
  totalDistance?: number;
  totalAltitude?: number;
  maxAltitude?: number;
  minAltitude?: number;
  summary?: string;
}

export interface OutboxEntry {
  id: bigint;
  sessionId: string;
  userId: bigint;
  eventType: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
  createdAt: Date;
}

export interface RetryEntry {
  id: bigint;
  outboxQueueId: bigint;
  sessionId: string;
  userId: bigint;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  lastError?: string;
}

export interface ConflictResolutionData {
  conflictType: 'duplicate' | 'version_mismatch' | 'data_divergence';
  localVersion: any;
  remoteVersion: any;
  resolution: 'last_write_wins' | 'merge' | 'manual';
  resolvedData?: any;
}

export interface SyncResult {
  success: boolean;
  sessionId: string;
  syncedAt: Date;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: SyncError[];
}

export interface SyncError {
  code: string;
  message: string;
  retriable: boolean;
  retryAfter?: number;
}

export interface SyncStatus {
  sessionId: string;
  isSynced: boolean;
  lastSyncAttempt?: Date;
  lastSyncSuccess?: Date;
  retryCount: number;
  syncFailureReason?: string;
}

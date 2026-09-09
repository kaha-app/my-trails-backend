import { Injectable } from '@nestjs/common';
import { ConflictResolutionData } from './sync.models';

@Injectable()
export class ConflictResolverService {
  /**
   * Detect conflicts between local and remote versions
   */
  detectConflict(local: any, remote: any): ConflictResolutionData | null {
    if (!local || !remote) {
      return null;
    }

    // Check for duplicate (same session already exists on server)
    if (this.isDuplicate(local, remote)) {
      return {
        conflictType: 'duplicate',
        localVersion: local,
        remoteVersion: remote,
        resolution: 'last_write_wins',
      };
    }

    // Check for version mismatch
    if (this.hasVersionMismatch(local, remote)) {
      return {
        conflictType: 'version_mismatch',
        localVersion: local,
        remoteVersion: remote,
        resolution: 'last_write_wins',
      };
    }

    // Check for data divergence (different modifications)
    if (this.hasDataDivergence(local, remote)) {
      return {
        conflictType: 'data_divergence',
        localVersion: local,
        remoteVersion: remote,
        resolution: 'merge',
      };
    }

    return null;
  }

  /**
   * Auto-resolve conflict using last-write-wins strategy
   */
  resolveLastWriteWins(local: any, remote: any): any {
    const localTime = new Date(local.updatedAt || local.timestamp);
    const remoteTime = new Date(remote.updatedAt || remote.timestamp);

    if (localTime > remoteTime) {
      return local;
    }

    return remote;
  }

  /**
   * Auto-resolve conflict using merge strategy
   * Combines waypoints from both versions
   */
  resolveMerge(local: any, remote: any): any {
    const merged = { ...remote, ...local };

    // Merge waypoints by deduplication
    if (local.waypoints && remote.waypoints) {
      const waypointMap = new Map();

      // Add remote waypoints first
      remote.waypoints.forEach((wp: any) => {
        const key = `${wp.latitude}_${wp.longitude}`;
        waypointMap.set(key, wp);
      });

      // Add/override with local waypoints
      local.waypoints.forEach((wp: any) => {
        const key = `${wp.latitude}_${wp.longitude}`;
        waypointMap.set(key, wp);
      });

      merged.waypoints = Array.from(waypointMap.values());
    }

    // Merge trackPoints
    if (local.trackPoints && remote.trackPoints) {
      const trackPointMap = new Map();

      // Add remote points first
      remote.trackPoints.forEach((tp: any, idx: number) => {
        trackPointMap.set(idx, tp);
      });

      // Append local points (they're newer)
      local.trackPoints.forEach((tp: any) => {
        const timestamp = new Date(tp.timestamp).getTime();
        trackPointMap.set(timestamp, tp);
      });

      merged.trackPoints = Array.from(trackPointMap.values());
    }

    // Update summary with merged data
    merged.totalDistance = this.calculateTotalDistance(merged.trackPoints || []);
    merged.totalAltitude = this.calculateAltitudeGain(merged.trackPoints || []);

    return merged;
  }

  /**
   * Check if sessions are duplicates
   */
  private isDuplicate(local: any, remote: any): boolean {
    if (!local.sessionId || !remote.sessionId) return false;

    // Same session ID
    if (local.sessionId === remote.sessionId) return true;

    // Same time range, same trail = likely duplicate
    if (
      local.trailId === remote.trailId &&
      local.startTime === remote.startTime &&
      local.endTime === remote.endTime
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check for version mismatch
   */
  private hasVersionMismatch(local: any, remote: any): boolean {
    // Different number of waypoints or trackPoints
    if (
      (local.waypoints?.length || 0) !== (remote.waypoints?.length || 0) ||
      (local.trackPoints?.length || 0) !== (remote.trackPoints?.length || 0)
    ) {
      return true;
    }

    // Different totals
    if (
      Math.abs((local.totalDistance || 0) - (remote.totalDistance || 0)) > 1 ||
      Math.abs((local.totalAltitude || 0) - (remote.totalAltitude || 0)) > 10
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check for data divergence
   */
  private hasDataDivergence(local: any, remote: any): boolean {
    // Check if different content was added to both
    const localLastUpdate = new Date(local.updatedAt || local.timestamp);
    const remoteLastUpdate = new Date(remote.updatedAt || remote.timestamp);

    // Both modified after each other's creation time = divergence
    return localLastUpdate > remoteLastUpdate && remoteLastUpdate > new Date(local.createdAt);
  }

  /**
   * Calculate total distance from track points (Haversine formula)
   */
  private calculateTotalDistance(trackPoints: any[]): number {
    if (trackPoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const distance = this.haversineDistance(
        trackPoints[i - 1],
        trackPoints[i],
      );
      totalDistance += distance;
    }

    return parseFloat(totalDistance.toFixed(2));
  }

  /**
   * Calculate altitude gain from track points
   */
  private calculateAltitudeGain(trackPoints: any[]): number {
    if (trackPoints.length === 0) return 0;

    let totalGain = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const prevElevation = trackPoints[i - 1].elevation || 0;
      const currElevation = trackPoints[i].elevation || 0;
      const diff = currElevation - prevElevation;

      if (diff > 0) {
        totalGain += diff;
      }
    }

    return Math.round(totalGain);
  }

  /**
   * Haversine formula for distance calculation
   */
  private haversineDistance(point1: any, point2: any): number {
    const R = 6371; // Earth's radius in km
    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;
    const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

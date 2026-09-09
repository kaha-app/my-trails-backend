# Hike Sync API Specification

## Overview
The Sync API enables complete offline-first hike recording with idempotent uploads supporting single-day and multi-day hikes, conflict detection, and persistent tracking.

## Endpoint

```
POST /api/hikes/sync
Authorization: Bearer <token>
Idempotency-Key: <clientUuid>:<localRevision>
Content-Type: multipart/form-data
```

## Request Structure

### Multipart Parts
- **data** (required): JSON string containing complete sync envelope
- **[media-uuid]** (optional): Image files named by their stable media UUID

### JSON Envelope Schema

```json
{
  "schemaVersion": 1,
  "clientUuid": "stable-hike-uuid",
  "localRevision": 3,
  "baseServerVersion": null,
  "trail": {
    "clientUuid": "trail-uuid",
    "name": "Hike Name",
    "region": "Region",
    "country": "Country",
    "distanceFromCityKm": 25.5,
    "startingPoint": "Trailhead Name",
    "difficulty": "moderate",
    "difficultyRating": 3.5,
    "distance": 12.5,
    "walkingTimeMin": 240,
    "walkingTimeMax": 360,
    "activity": "hiking",
    "groupSize": 4,
    "maxAltitude": 2500,
    "duration": "5 days",
    "description": "Trail description",
    "transportation": {
      "privateOption": "Taxi to trailhead",
      "publicOption": "Bus from city",
      "returnOption": "Public transport back"
    },
    "permitRequired": false,
    "recordedAt": "2026-09-08T04:54:27.247Z"
  },
  "relatedTrails": [],
  "multiDayHike": {
    "clientUuid": "multi-day-uuid",
    "name": "Multi-day Group",
    "description": "Multiple days",
    "status": "active",
    "createdTime": "2026-09-08T04:54:27.247Z",
    "updatedTime": "2026-09-08T04:54:27.247Z"
  },
  "sessions": [
    {
      "clientUuid": "session-day-1",
      "dayNumber": 1,
      "startTime": "2026-09-08T06:00:00Z",
      "endTime": "2026-09-08T18:00:00Z",
      "status": "completed",
      "distance": 12.5,
      "duration": 43200,
      "maxElevation": 2500,
      "multiDayGroupUuid": "multi-day-uuid"
    }
  ],
  "trackPoints": [
    {
      "latitude": 27.9881,
      "longitude": 86.9250,
      "altitude": 5364,
      "timestamp": "2026-09-08T06:15:30Z",
      "accuracy": 5.2,
      "heading": 45.5,
      "speed": 1.2
    }
  ],
  "waypoints": [
    {
      "clientUuid": "waypoint-uuid",
      "name": "Rest Area",
      "description": "Water and shade",
      "type": "restArea",
      "latitude": 27.9881,
      "longitude": 86.9250,
      "elevation": 5364,
      "distanceFromStart": 5.2,
      "durationAtStart": "1 hour",
      "timestamp": "2026-09-08T08:00:00Z",
      "facilities": ["water", "shade"],
      "conditions": "Good",
      "photoClientUuids": ["photo-uuid-1", "photo-uuid-2"]
    }
  ],
  "media": [
    {
      "clientUuid": "photo-uuid-1",
      "type": "poi",
      "waypointClientUuid": "waypoint-uuid",
      "createdTime": "2026-09-08T08:00:00Z",
      "checksum": "sha256hash..."
    }
  ]
}
```

## Field Specifications

### Trail Object
- `clientUuid`: Permanent globally unique identifier (stable across syncs)
- `name`: Trail/hike name
- `region`: Regional location
- `country`: Country
- `distanceFromCityKm`: Distance from nearest city (decimal km)
- `difficulty`: easy, easy_to_moderate, moderate, moderate_to_difficult, difficult, expert
- `difficultyRating`: 1-5 scale
- `distance`: Total distance (km)
- `walkingTimeMin/Max`: Walking duration in minutes
- `activity`: hiking, trekking, walking, trail_running, sightseeing
- `maxAltitude`: Highest elevation (meters)
- `duration`: "X days" format
- `permitRequired`: boolean
- `recordedAt`: ISO-8601 UTC timestamp

### Track Points
- `latitude`: Decimal degrees (WGS84)
- `longitude`: Decimal degrees (WGS84)
- `altitude`: Elevation in meters
- `timestamp`: ISO-8601 UTC
- `accuracy`: Horizontal accuracy in meters
- `heading`: Compass bearing 0-360
- `speed`: Speed in m/s

### Waypoints
- `clientUuid`: Stable UUID for this waypoint
- `type`: viewpoint, restArea, waterSource, campsite, landmark, danger, parking, trailhead, junction, shelter, bridge, summit, other
- `photoClientUuids`: Array of media UUIDs linked to this waypoint
- Coordinates as decimal degrees
- `distanceFromStart`: km along route
- `durationAtStart`: Human-readable duration (e.g., "2.5 hours")
- `facilities`: Array of facility types available
- `timestamp`: ISO-8601 UTC

### Media
- `clientUuid`: Stable UUID (used as filename in multipart)
- `type`: cover, route, gallery, poi
- `waypointClientUuid`: Only for type "poi"
- `checksum`: SHA256 hash (optional, for integrity)

## Response Format

```json
{
  "success": true,
  "rootServerId": "server-hike-id",
  "committedServerVersion": 2,
  "acknowledgedLocalRevision": 3,
  "clientUuid": "stable-hike-uuid",
  "sessionMappings": {
    "session-day-1": {
      "clientUuid": "session-day-1",
      "serverId": "server-session-id"
    }
  },
  "waypointMappings": {
    "waypoint-uuid": {
      "clientUuid": "waypoint-uuid",
      "serverId": "server-waypoint-id"
    }
  },
  "mediaMappings": {
    "photo-uuid-1": {
      "clientUuid": "photo-uuid-1",
      "serverMediaId": "media-id",
      "url": "https://server/media/url"
    }
  },
  "trackPointCount": 250,
  "waypointCount": 5,
  "imageCount": 12,
  "syncedAt": "2026-09-08T04:54:27.247Z"
}
```

## Key Features

### Idempotent Uploads
- Header: `Idempotency-Key: <clientUuid>:<localRevision>`
- Repeating the same sync with same key returns cached response
- No duplicate records created on retry

### Conflict Detection
- Send `baseServerVersion` from last known server version
- If server version differs, returns `409 Conflict`
- Client must resolve conflicts before retry

### Ownership Tracking
- Each hike has `clientUuid` (permanent, from client)
- Server tracks `ownerUserId` from auth token
- Prevents uploading other users' records
- Cannot change ownership

### Sync Tracking
- `localRevision`: Incremented on client whenever data changes
- `syncedRevision`: Last revision acknowledged by server
- `serverVersion`: Server's version for conflict detection
- Status: pending, uploading, synced, failed, conflict

### Media Management
- Images uploaded as multipart file parts named by `clientUuid`
- Server returns URL and ID mappings
- Local path stored for offline reference
- Checksum enables resumable uploads

## Size Limits

- Total request: 100 MB
- Per file: 50 MB (recommend 10-20 MB)
- Track points: 100,000 max
- Waypoints: 10,000 max
- Media files: 500 max

## Error Responses

### 400 Bad Request
- Invalid JSON schema
- Missing required fields
- Data exceeds limits
- Invalid coordinates or timestamps

### 401 Unauthorized
- Missing or invalid auth token
- Token expired

### 409 Conflict
```json
{
  "code": "CONFLICT",
  "message": "Server version mismatch. Local changes conflict with server updates.",
  "currentServerVersion": 2,
  "clientBaseVersion": 1
}
```

### 403 Forbidden
- Attempting to upload record owned by another user

## Client Implementation Checklist

1. **Persistence**
   - [ ] Generate `clientUuid` once per hike, store locally
   - [ ] Track `localRevision` (increment on any change)
   - [ ] Store last `serverVersion` from response
   - [ ] Maintain media UUID → local path mapping

2. **Upload Flow**
   - [ ] Validate all required fields present
   - [ ] Verify all referenced images exist locally
   - [ ] Create idempotency key: `${clientUuid}:${localRevision}`
   - [ ] Set upload-specific timeout (30-60 sec for network issues)
   - [ ] Report progress during multipart upload

3. **Retry Strategy**
   - [ ] Retry with same idempotency key (safe)
   - [ ] Store sync job locally (recover on app restart)
   - [ ] Return to draft on sync failure
   - [ ] Show actionable error messages

4. **Conflict Resolution**
   - [ ] Display conflict message with versions
   - [ ] Offer: discard local, force overwrite, or merge
   - [ ] Update `baseServerVersion` before retry

5. **Local State Updates**
   - [ ] Save all UUID mappings returned by server
   - [ ] Update local records with server IDs
   - [ ] Clear pending sync job only after all mappings saved
   - [ ] Refresh UI with confirmed sync state

## Example curl

```bash
curl -X POST http://localhost:4000/api/hikes/sync \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Idempotency-Key: abc-def:1" \
  -F "data=@request.json" \
  -F "photo-uuid-1=@/path/to/photo1.jpg" \
  -F "photo-uuid-2=@/path/to/photo2.jpg"
```

## Database Schema

### HikeSyncTracker
Tracks sync state per hike:
- `clientUuid`: Unique hike identifier from client
- `ownerUserId`: Account that owns the hike
- `localRevision`: Current client revision
- `syncedRevision`: Last acknowledged revision
- `serverVersion`: Conflict detection
- `syncStatus`: pending, uploading, synced, failed, conflict
- `lastSyncedAt`: Last successful sync timestamp
- `lastSyncError`: Error message from last attempt

### SyncMediaMapping
Links media files to server records:
- `clientMediaUuid`: Stable UUID from client
- `serverMediaId`: Server ID after upload
- `serverMediaUrl`: Accessible URL
- `mediaType`: cover, route, gallery, poi
- `uploadStatus`: Tracks individual media state

### SyncJobRecord
Idempotency tracking:
- `idempotencyKey`: Unique per sync attempt
- `revision`: Which revision was synced
- `status`: Tracks completion state
- `error`: Failure details for debugging

### MultiDayHikeSync
Groups related sessions:
- `clientUuid`: Permanent group ID
- `ownerUserId`: Account ownership
- Mirrors sync tracking for group-level operations

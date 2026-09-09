# Flutter Sync Implementation Guide

This guide details the Flutter client-side implementation for the hike sync feature according to the backend contract.

## Architecture Overview

### Data Flow
1. **Local Recording** → Record hike with GPS, waypoints, photos
2. **Offline Preparation** → Build sync envelope, prepare files
3. **Network Upload** → Multipart POST with idempotency key
4. **Mapping Storage** → Save server IDs and URLs locally
5. **UI Update** → Show sync status and confirmation

### Local Database Schema Extensions

Add these fields to your SQLite schema:

#### HikeSync Table (per hike)
```sql
CREATE TABLE hike_sync (
  id INTEGER PRIMARY KEY,
  client_uuid TEXT UNIQUE NOT NULL,
  owner_user_id INTEGER NOT NULL,
  server_id TEXT,
  local_revision INTEGER DEFAULT 1,
  synced_revision INTEGER,
  server_version INTEGER,
  sync_status TEXT DEFAULT 'pending', -- pending, uploading, synced, failed, conflict
  last_synced_at TEXT, -- ISO-8601
  last_sync_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### MediaMapping Table (per file)
```sql
CREATE TABLE media_mapping (
  id INTEGER PRIMARY KEY,
  hike_sync_id INTEGER NOT NULL,
  local_path TEXT NOT NULL,
  client_media_uuid TEXT UNIQUE NOT NULL,
  server_media_id TEXT,
  server_media_url TEXT,
  checksum TEXT, -- SHA256
  upload_status TEXT DEFAULT 'pending',
  media_type TEXT NOT NULL, -- cover, route, gallery, poi
  waypoint_client_uuid TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(hike_sync_id) REFERENCES hike_sync(id)
);
```

#### SyncJob Table (retry tracking)
```sql
CREATE TABLE sync_job (
  id INTEGER PRIMARY KEY,
  hike_sync_id INTEGER NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, uploading, synced, failed
  uploaded_at TEXT,
  completed_at TEXT,
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(hike_sync_id) REFERENCES hike_sync(id)
);
```

#### SessionMapping Table (multi-day)
```sql
CREATE TABLE session_mapping (
  id INTEGER PRIMARY KEY,
  hike_sync_id INTEGER NOT NULL,
  client_session_uuid TEXT UNIQUE NOT NULL,
  server_session_id TEXT,
  day_number INTEGER,
  FOREIGN KEY(hike_sync_id) REFERENCES hike_sync(id)
);
```

#### WaypointMapping Table
```sql
CREATE TABLE waypoint_mapping (
  id INTEGER PRIMARY KEY,
  hike_sync_id INTEGER NOT NULL,
  client_waypoint_uuid TEXT UNIQUE NOT NULL,
  server_waypoint_id TEXT,
  FOREIGN KEY(hike_sync_id) REFERENCES hike_sync(id)
);
```

## Step-by-Step Implementation

### Step 1: Initialize Hike for Sync

When creating a new hike record:

```dart
import 'package:uuid/uuid.dart';
import 'package:crypto/crypto.dart';

class HikeSyncService {
  static const _uuid = Uuid();
  
  Future<void> initializeHikeSync(Hike hike) async {
    final clientUuid = _uuid.v4(); // Generate once, never change
    
    await db.insert('hike_sync', {
      'client_uuid': clientUuid,
      'owner_user_id': currentUserId,
      'local_revision': 1,
      'sync_status': 'pending',
      'created_at': DateTime.now().toIso8601String(),
    });
  }
}
```

### Step 2: Validate and Prepare Data

```dart
class SyncValidator {
  Future<bool> validateHikeForSync(int hikeSyncId) async {
    // Verify recording is stopped
    final recording = await getActiveRecording();
    if (recording != null && recording.status != 'completed') {
      throw Exception('Cannot sync active recording. Stop recording first.');
    }
    
    // Load hike data
    final hike = await db.query('recorded_trails', 
      where: 'id = ?', 
      whereArgs: [hikeSyncId]
    ).then((r) => r.first);
    
    // Verify required fields
    final required = ['name', 'region', 'country', 'activity'];
    for (final field in required) {
      if (hike[field] == null || hike[field].toString().isEmpty) {
        throw Exception('Missing required field: $field');
      }
    }
    
    // Verify referenced images exist
    final media = await db.query('media_mapping',
      where: 'hike_sync_id = ?',
      whereArgs: [hikeSyncId]
    );
    
    for (final m in media) {
      final file = File(m['local_path']);
      if (!await file.exists()) {
        throw Exception('Image missing: ${m['local_path']}');
      }
    }
    
    return true;
  }
}
```

### Step 3: Build Sync Request Envelope

```dart
class SyncRequestBuilder {
  Future<SyncRequest> buildRequest(int hikeSyncId, String userId) async {
    // Load sync tracker
    final trackerRow = await db.query('hike_sync',
      where: 'id = ?',
      whereArgs: [hikeSyncId]
    ).then((r) => r.first);
    
    final clientUuid = trackerRow['client_uuid'];
    final localRevision = trackerRow['local_revision'] ?? 1;
    final baseServerVersion = trackerRow['server_version'];
    
    // Load trail data
    final trail = await _buildTrailObject(hikeSyncId);
    
    // Load multi-day info if applicable
    MultiDayHike? multiDay;
    final multiDayId = trackerRow['multi_day_hike_id'];
    if (multiDayId != null) {
      multiDay = await _buildMultiDayObject(multiDayId);
    }
    
    // Load sessions
    final sessions = await _buildSessionObjects(hikeSyncId);
    
    // Load track points
    final trackPoints = await _buildTrackPoints(hikeSyncId);
    
    // Load waypoints
    final waypoints = await _buildWaypoints(hikeSyncId);
    
    // Load media manifest
    final media = await _buildMediaManifest(hikeSyncId);
    
    return SyncRequest(
      schemaVersion: 1,
      clientUuid: clientUuid,
      localRevision: localRevision,
      baseServerVersion: baseServerVersion,
      trail: trail,
      multiDayHike: multiDay,
      sessions: sessions,
      trackPoints: trackPoints,
      waypoints: waypoints,
      media: media,
    );
  }
  
  Future<TrailObject> _buildTrailObject(int hikeSyncId) async {
    final row = await db.query('recorded_trails',
      where: 'sync_id = ?',
      whereArgs: [hikeSyncId]
    ).then((r) => r.first);
    
    return TrailObject(
      clientUuid: row['client_uuid'],
      name: row['name'],
      region: row['region'],
      country: row['country'],
      distance: double.tryParse(row['distance'].toString()),
      maxAltitude: int.tryParse(row['max_altitude'].toString()),
      // ... map all fields
      recordedAt: DateTime.now().toUtc().toIso8601String(),
    );
  }
  
  Future<List<TrackPointObject>> _buildTrackPoints(int hikeSyncId) async {
    final rows = await db.query('track_points',
      where: 'session_id IN (SELECT server_session_id FROM session_mapping WHERE hike_sync_id = ?)',
      whereArgs: [hikeSyncId]
    );
    
    return rows.map((r) => TrackPointObject(
      latitude: double.parse(r['latitude'].toString()),
      longitude: double.parse(r['longitude'].toString()),
      altitude: int.tryParse(r['elevation'].toString()),
      timestamp: r['timestamp'],
      accuracy: double.tryParse(r['accuracy'].toString()),
    )).toList();
  }
}
```

### Step 4: Create Persistent Sync Job

```dart
class SyncJobManager {
  Future<int> createSyncJob(int hikeSyncId, String clientUuid, int revision) async {
    final idempotencyKey = '$clientUuid:$revision';
    
    final id = await db.insert('sync_job', {
      'hike_sync_id': hikeSyncId,
      'idempotency_key': idempotencyKey,
      'revision': revision,
      'status': 'pending',
      'created_at': DateTime.now().toIso8601String(),
    });
    
    return id;
  }
  
  Future<SyncJob?> getPendingJob(int hikeSyncId) async {
    final rows = await db.query('sync_job',
      where: 'hike_sync_id = ? AND status != ?',
      whereArgs: [hikeSyncId, 'synced'],
      orderBy: 'created_at DESC',
      limit: 1
    );
    
    return rows.isNotEmpty ? rows.first : null;
  }
  
  Future<void> markJobUploading(int jobId) async {
    await db.update('sync_job', {
      'status': 'uploading',
      'uploaded_at': DateTime.now().toIso8601String(),
    }, where: 'id = ?', whereArgs: [jobId]);
  }
}
```

### Step 5: Upload with Idempotency

```dart
class SyncUploader {
  Future<SyncResponse> uploadHike(
    SyncRequest request,
    Map<String, File> imageFiles,
    String authToken,
  ) async {
    final idempotencyKey = '${request.clientUuid}:${request.localRevision}';
    final jobManager = SyncJobManager();
    
    try {
      // Create job record
      final jobId = await jobManager.createSyncJob(
        request.hikeSyncId,
        request.clientUuid,
        request.localRevision,
      );
      
      await jobManager.markJobUploading(jobId);
      
      // Build multipart request
      var request = http.MultipartRequest('POST', 
        Uri.parse('$API_BASE/api/hikes/sync')
      );
      
      request.headers['Authorization'] = 'Bearer $authToken';
      request.headers['Idempotency-Key'] = idempotencyKey;
      
      // Add JSON data
      request.fields['data'] = jsonEncode(syncRequest.toJson());
      
      // Add image files by UUID
      for (final entry in imageFiles.entries) {
        final file = entry.value;
        request.files.add(await http.MultipartFile.fromPath(
          entry.key, // Use UUID as field name
          file.path,
        ));
      }
      
      // Send with progress
      var response = await request.send()
        .timeout(Duration(seconds: 60), onTimeout: () {
          // Return partial response or rethrow
          throw TimeoutException('Upload timeout');
        });
      
      if (response.statusCode == 409) {
        // Conflict detected
        final body = await response.stream.bytesToString();
        throw ConflictException(jsonDecode(body));
      }
      
      if (response.statusCode != 200) {
        throw HttpException('Upload failed: ${response.statusCode}');
      }
      
      final body = await response.stream.bytesToString();
      return SyncResponse.fromJson(jsonDecode(body));
      
    } on TimeoutException {
      // Keep job pending for retry
      rethrow;
    } on SocketException {
      // Network error, keep job pending
      rethrow;
    } catch (e) {
      // Mark as failed
      await jobManager.markJobFailed(jobId, e.toString());
      rethrow;
    }
  }
}
```

### Step 6: Save Mappings and Update State

```dart
class SyncStateManager {
  Future<void> saveSyncResponse(
    int hikeSyncId,
    SyncResponse response,
  ) async {
    // Wrap in transaction
    await db.transaction(() async {
      // Update main tracker
      await db.update('hike_sync', {
        'server_id': response.rootServerId,
        'synced_revision': response.acknowledgedLocalRevision,
        'server_version': response.committedServerVersion,
        'sync_status': 'synced',
        'last_synced_at': DateTime.now().toIso8601String(),
        'last_sync_error': null,
      }, where: 'id = ?', whereArgs: [hikeSyncId]);
      
      // Save session mappings
      for (final entry in response.sessionMappings.entries) {
        await db.update('session_mapping', {
          'server_session_id': entry.value['serverId'],
        }, where: 'hike_sync_id = ? AND client_session_uuid = ?',
          whereArgs: [hikeSyncId, entry.key]);
      }
      
      // Save waypoint mappings
      for (final entry in response.waypointMappings.entries) {
        await db.update('waypoint_mapping', {
          'server_waypoint_id': entry.value['serverId'],
        }, where: 'hike_sync_id = ? AND client_waypoint_uuid = ?',
          whereArgs: [hikeSyncId, entry.key]);
      }
      
      // Save media mappings
      for (final entry in response.mediaMappings.entries) {
        await db.update('media_mapping', {
          'server_media_id': entry.value['serverMediaId'],
          'server_media_url': entry.value['url'],
          'upload_status': 'synced',
        }, where: 'hike_sync_id = ? AND client_media_uuid = ?',
          whereArgs: [hikeSyncId, entry.key]);
      }
      
      // Mark job complete only after all mappings saved
      await db.update('sync_job', {
        'status': 'synced',
        'completed_at': DateTime.now().toIso8601String(),
      }, where: 'hike_sync_id = ?', whereArgs: [hikeSyncId]);
    });
  }
}
```

### Step 7: Implement Failure Handling

```dart
class SyncErrorHandler {
  Future<void> handleSyncError(
    int hikeSyncId,
    dynamic error,
    StackTrace stack,
  ) async {
    String errorMsg = 'Unknown error';
    bool isRetryable = true;
    
    if (error is TimeoutException) {
      errorMsg = 'Sync timeout. Check connection and retry.';
      isRetryable = true;
    } else if (error is SocketException) {
      errorMsg = 'Network error. Retry when connected.';
      isRetryable = true;
    } else if (error is ConflictException) {
      errorMsg = 'Conflict: Server has changes. Review and sync again.';
      isRetryable = false;
    } else if (error is ForbiddenException) {
      errorMsg = 'Permission denied. Check account.';
      isRetryable = false;
    } else if (error is HttpException) {
      errorMsg = error.toString();
      isRetryable = false;
    }
    
    await db.update('hike_sync', {
      'sync_status': isRetryable ? 'failed' : 'conflict',
      'last_sync_error': errorMsg,
    }, where: 'id = ?', whereArgs: [hikeSyncId]);
  }
  
  Future<bool> canRetry(int hikeSyncId) async {
    final row = await db.query('hike_sync',
      where: 'id = ?',
      whereArgs: [hikeSyncId]
    ).then((r) => r.firstOrNull);
    
    return row != null && 
           (row['sync_status'] == 'failed' || row['sync_status'] == 'pending');
  }
}
```

### Step 8: Recover Interrupted Jobs on App Start

```dart
class SyncRecoveryService {
  Future<void> recoverInterruptedSyncs() async {
    // Find pending/uploading jobs
    final jobs = await db.query('sync_job',
      where: 'status IN (?, ?)',
      whereArgs: ['pending', 'uploading']
    );
    
    for (final job in jobs) {
      final hikeSyncId = job['hike_sync_id'];
      
      // Re-validate hike still exists and hasn't been deleted
      final hike = await db.query('recorded_trails',
        where: 'id = ?',
        whereArgs: [hikeSyncId]
      ).then((r) => r.firstOrNull);
      
      if (hike == null) {
        // Hike was deleted, mark job failed
        await db.update('sync_job', {
          'status': 'failed',
          'error': 'Hike was deleted',
        }, where: 'id = ?', whereArgs: [job['id']]);
        continue;
      }
      
      // Check if recording is still active
      final recording = await getActiveRecording();
      if (recording != null && recording.hikeSyncId == hikeSyncId) {
        // Still recording, skip recovery
        continue;
      }
      
      // Attempt to retry this sync
      // (UI will be notified of pending sync on home screen)
    }
  }
}
```

## UI Implementation

### Sync Status Display

Show on saved hike detail screen:

```dart
Widget buildSyncStatus(HikeSyncState state) {
  switch (state.syncStatus) {
    case 'pending':
      return Row(children: [
        Icon(Icons.cloud_upload_outlined),
        SizedBox(width: 8),
        Text('Not synced'),
        SizedBox(width: 8),
        ElevatedButton(
          onPressed: () => _startSync(),
          child: Text('Sync now'),
        ),
      ]);
      
    case 'uploading':
      return Row(children: [
        SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        SizedBox(width: 8),
        Text('Syncing... ${state.uploadProgress}%'),
      ]);
      
    case 'synced':
      return Row(children: [
        Icon(Icons.check_circle, color: Colors.green),
        SizedBox(width: 8),
        Text('Synced ${state.lastSyncedAt.relative}'),
      ]);
      
    case 'failed':
      return Row(children: [
        Icon(Icons.error, color: Colors.orange),
        SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sync failed'),
            Text(state.lastSyncError, style: TextStyle(fontSize: 12)),
          ],
        ),
        SizedBox(width: 8),
        TextButton(
          onPressed: () => _retrySync(),
          child: Text('Retry'),
        ),
      ]);
      
    case 'conflict':
      return Row(children: [
        Icon(Icons.warning, color: Colors.red),
        SizedBox(width: 8),
        Expanded(
          child: Text('Changes on server. Resolve conflict in settings.'),
        ),
      ]);
  }
}
```

### Prevent Duplicate Taps

```dart
class SyncButton extends StatefulWidget {
  @override
  State<SyncButton> createState() => _SyncButtonState();
}

class _SyncButtonState extends State<SyncButton> {
  bool _isSyncing = false;
  
  Future<void> _startSync() async {
    if (_isSyncing) return; // Ignore duplicate taps
    
    setState(() => _isSyncing = true);
    
    try {
      await hikeSyncService.syncHike(widget.hikeSyncId);
    } finally {
      setState(() => _isSyncing = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _isSyncing ? null : _startSync,
      child: Text(_isSyncing ? 'Syncing...' : 'Sync'),
    );
  }
}
```

## Migration Strategy

For existing hikes without sync data:

```dart
Future<void> backfillSyncData() async {
  final existingHikes = await db.query('recorded_trails',
    where: 'client_uuid IS NULL'
  );
  
  for (final hike in existingHikes) {
    final clientUuid = Uuid().v4();
    
    await db.update('recorded_trails', {
      'client_uuid': clientUuid,
    }, where: 'id = ?', whereArgs: [hike['id']]);
    
    // Create sync tracker
    await db.insert('hike_sync', {
      'client_uuid': clientUuid,
      'owner_user_id': currentUserId,
      'local_revision': 1,
      'sync_status': 'pending', // Never silently upload
      'created_at': DateTime.now().toIso8601String(),
    });
  }
}
```

## Testing Checklist

- [ ] Single-day hike uploads all details, coordinates, POIs, images
- [ ] Multi-day hike uploads all related days with correct associations
- [ ] Cover, gallery, POI images appear under correct server records
- [ ] Repeat sync creates no duplicates
- [ ] Edit and re-sync updates existing record
- [ ] Losing connection allows safe retry
- [ ] Missing images produce visible failure
- [ ] Account switch cannot upload other user's records
- [ ] Fetching uploaded hike reproduces all details
- [ ] Local hike remains usable offline after sync

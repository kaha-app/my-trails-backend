import { SyncService } from './sync.service';

describe('recording fields reach draft trail details', () => {
  test('a newer revision reuses the tracker server ID instead of creating a duplicate trail', async () => {
    const tracker = {
      id: 7n,
      clientUuid: 'recording-1',
      ownerUserId: 1n,
      serverId: '16',
      serverVersion: 1,
    };
    const db: any = {
      syncJobRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 9n }),
        update: jest.fn(),
      },
      hikeSyncTracker: {
        findUnique: jest.fn().mockResolvedValue(tracker),
        update: jest.fn().mockResolvedValue({
          ...tracker,
          localRevision: 2,
          syncedRevision: 2,
          serverVersion: 2,
        }),
      },
      trail: {
        findUnique: jest.fn().mockResolvedValue({ id: 16n }),
        create: jest.fn(),
      },
    };
    const service = new SyncService(db, {} as any);
    const result = await service.syncTrail(1n, 'recording-1:2', {
      schemaVersion: 1,
      clientUuid: 'recording-1',
      localRevision: 2,
      trail: {
        clientUuid: 'recording-1',
        name: 'Edited name',
        region: 'Kathmandu',
        country: 'Nepal',
        recordedAt: new Date().toISOString(),
      },
      trackPoints: [],
      waypoints: [],
      media: [],
    });
    expect(result.rootServerId).toBe('16');
    expect(result.committedServerVersion).toBe(2);
    expect(db.trail.create).not.toHaveBeenCalled();
  });

  test('stores maxAltitudeM and does not interpret minutes as days', async () => {
    const db: any = {
      trail: { create: jest.fn().mockResolvedValue({ id: 16n }) },
    };
    const service: any = new SyncService({} as any, {} as any);
    await service.createTrailFromSync(
      {
        name: 'Recorded',
        clientUuid: 'uuid-123456',
        maxAltitudeM: 1249,
        duration: '90 minutes',
      },
      db,
    );
    expect(db.trail.create.mock.calls[0][0].data).toMatchObject({
      maxAltitudeM: 1249,
      durationLabel: '90 minutes',
      durationDays: null,
    });
  });

  test('preserves decimal recording elevations and links manifest images to POIs', async () => {
    const db: any = {
      hikeSession: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', trailId: 16n }),
      },
      hikeWaypoint: { create: jest.fn().mockResolvedValue({ id: 8n }) },
      pointOfInterest: { create: jest.fn().mockResolvedValue({ id: 44n }) },
      hikeWaypointPhoto: { create: jest.fn() },
    };
    const service: any = new SyncService({} as any, {} as any);
    await service.syncWaypoints(
      {},
      1n,
      [
        {
          clientUuid: 'wp1',
          name: 'Summit',
          elevation: 1249.7,
          latitude: 27.7,
          longitude: 85.3,
          distanceAlong: 0,
        },
      ],
      new Map([['s1', { serverId: 's1' }]]),
      new Map([
        ['photo1', { url: '/uploads/poi.jpg', waypointClientUuid: 'wp1' }],
      ]),
      db,
    );
    expect(db.pointOfInterest.create.mock.calls[0][0].data).toMatchObject({
      altitudeM: 1250,
      distanceKm: 0,
      images: ['/uploads/poi.jpg'],
    });
    expect(db.hikeWaypoint.create.mock.calls[0][0].data.elevation).toBe(1249.7);
    expect(db.hikeWaypointPhoto.create).toHaveBeenCalledTimes(1);
  });

  test('a failed POI insert cannot be silently acknowledged as a complete sync', async () => {
    const db: any = {
      hikeSession: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', trailId: 16n }),
      },
      hikeWaypoint: { create: jest.fn().mockResolvedValue({ id: 8n }) },
      pointOfInterest: {
        create: jest.fn().mockRejectedValue(new Error('insert failed')),
      },
    };
    const service: any = new SyncService({} as any, {} as any);
    await expect(
      service.syncWaypoints(
        {},
        1n,
        [{ clientUuid: 'wp1', name: 'Summit' }],
        new Map([['s1', { serverId: 's1' }]]),
        new Map(),
        db,
      ),
    ).rejects.toThrow('insert failed');
  });
});

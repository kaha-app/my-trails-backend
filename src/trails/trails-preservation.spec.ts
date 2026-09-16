import { TrailsService } from './trails.service';
import { recordedGpx } from './recorded-gpx';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

function setup() {
  const entity = () => ({
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  });
  const tx: any = {
    trail: entity(),
    trailLocation: entity(),
    trailTransportation: entity(),
    trailHighlight: entity(),
    itineraryPhase: entity(),
    itineraryPhaseDetail: entity(),
    pointOfInterest: entity(),
    trailCostItem: entity(),
    trailRecommendedSeason: entity(),
    trailAvoidedMonth: entity(),
    trailSafetyItem: entity(),
    hikeWaypoint: entity(),
  };
  const prisma: any = {
    $transaction: jest.fn(async (callback) => callback(tx)),
    trail: { findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new TrailsService(prisma, {} as any);
  return { service, prisma, tx };
}

describe('draft updates preserve recordings', () => {
  test('updates nested data in one transaction and leaves omitted route/POI/media relations alone', async () => {
    const { service, prisma, tx } = setup();
    const detail = {
      id: 16n,
      slug: 'recorded',
      routeFilePath: '/uploads/route.gpx',
    };
    const fetch = jest
      .spyOn(service, 'findById')
      .mockResolvedValue(detail as any);
    tx.itineraryPhase.create.mockResolvedValue({ id: 90n });
    await service.update(16n, {
      description: 'New details',
      itineraryPhases: [
        {
          phaseNumber: 1,
          title: 'Ascent',
          details: [{ detail: 'Follow ridge' }],
        },
      ],
      costItems: [{ type: 'included', text: 'Guide' }],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.trail.update).toHaveBeenCalledWith({
      where: { id: 16n },
      data: { description: 'New details' },
    });
    expect(tx.itineraryPhaseDetail.create).toHaveBeenCalledWith({
      data: { phaseId: 90n, detail: 'Follow ridge', sortOrder: 0 },
    });
    expect(tx.pointOfInterest.deleteMany).not.toHaveBeenCalled();
    expect(tx.pointOfInterest.update).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('assigns unique itinerary and same-type cost sort orders when the client omits them', async () => {
    const { service, tx } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 16n } as any);
    tx.itineraryPhase.create.mockResolvedValue({ id: 90n });
    await service.update(16n, {
      itineraryPhases: [
        {
          phaseNumber: 1,
          title: 'Ascent',
          details: [{ detail: 'Follow ridge' }, { detail: 'Reach summit' }],
        },
      ],
      costItems: [
        { type: 'included', text: 'Guide' },
        { type: 'included', text: 'Permit' },
      ],
    });
    expect(tx.itineraryPhaseDetail.create).toHaveBeenNthCalledWith(1, {
      data: { phaseId: 90n, detail: 'Follow ridge', sortOrder: 0 },
    });
    expect(tx.itineraryPhaseDetail.create).toHaveBeenNthCalledWith(2, {
      data: { phaseId: 90n, detail: 'Reach summit', sortOrder: 1 },
    });
    expect(tx.trailCostItem.create).toHaveBeenNthCalledWith(1, {
      data: { trailId: 16n, type: 'included', text: 'Guide', sortOrder: 0 },
    });
    expect(tx.trailCostItem.create).toHaveBeenNthCalledWith(2, {
      data: { trailId: 16n, type: 'included', text: 'Permit', sortOrder: 1 },
    });
  });

  test('POI edit keeps identity, omitted photos, and untouched POIs', async () => {
    const { service, tx } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 16n } as any);
    tx.pointOfInterest.findFirst.mockResolvedValue({
      id: 44n,
      trailId: 16n,
      images: ['/old.jpg'],
    });
    await service.update(16n, {
      pointsOfInterest: [
        { id: '44', name: 'Updated', latitude: '0', longitude: '0' },
      ],
    } as any);
    expect(tx.pointOfInterest.update).toHaveBeenCalledWith({
      where: { id: 44n },
      data: { name: 'Updated', latitude: 0, longitude: 0 },
    });
    expect(tx.pointOfInterest.create).not.toHaveBeenCalled();
    expect(tx.pointOfInterest.deleteMany).not.toHaveBeenCalled();
  });

  test('relation errors reject the transaction instead of reporting partial success', async () => {
    const { service, tx } = setup();
    const fetch = jest
      .spyOn(service, 'findById')
      .mockResolvedValue({ id: 16n } as any);
    tx.trailCostItem.create.mockRejectedValue(new Error('database failure'));
    await expect(
      service.update(16n, { costItems: [{ type: 'included', text: 'Guide' }] }),
    ).rejects.toThrow('database failure');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('rejects a POI belonging to another trail', async () => {
    const { service, tx } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 16n } as any);
    tx.pointOfInterest.findFirst.mockResolvedValue(null);
    await expect(
      service.update(16n, {
        pointsOfInterest: [{ id: '99', name: 'Other' }],
      } as any),
    ).rejects.toThrow('POI does not belong');
    expect(tx.pointOfInterest.update).not.toHaveBeenCalled();
  });

  test('detail returns recorded elevation/route and legacy waypoint photos', async () => {
    const { service, prisma } = setup();
    prisma.trail.findUnique.mockResolvedValue({
      id: 16n,
      hikeName: 'A & B',
      maxAltitudeM: null,
      routeFilePath: 'phone.gpx',
      media: [],
      pointsOfInterest: [],
      hikeSessions: [
        {
          trackPoints: [
            {
              latitude: 27.7,
              longitude: 85.3,
              elevation: 1249.4,
              timestamp: new Date('2026-09-16T00:00:00Z'),
            },
          ],
        },
      ],
      hikeWaypoints: [
        {
          id: 8n,
          name: 'Summit',
          elevation: 1249.4,
          photos: [{ photoUrl: '/uploads/poi.jpg' }],
          facilities: [],
        },
      ],
    });
    const result = await service.findById(16n);
    expect(result.maxAltitudeM).toBe(1249);
    expect(result.pointsOfInterest[0].images).toEqual(['/uploads/poi.jpg']);
    expect(
      Buffer.from(result.routeFileContent!, 'base64').toString(),
    ).toContain('A &amp; B');
  });

  test('detail includes recorded intersections alongside edited POIs', async () => {
    const { service, prisma } = setup();
    prisma.trail.findUnique.mockResolvedValue({
      id: 16n,
      hikeName: 'Trail',
      maxAltitudeM: 1200,
      routeFilePath: null,
      media: [],
      pointsOfInterest: [
        { id: 44n, name: 'Summit', latitude: 27.7, longitude: 85.3 },
      ],
      hikeSessions: [{ trackPoints: [] }],
      hikeWaypoints: [
        {
          id: 8n,
          name: 'Intersection',
          latitude: 27.71,
          longitude: 85.31,
          elevation: 1100,
          description: null,
          distanceFromStart: 1,
          type: 'intersection',
          facilities: [],
          photos: [],
        },
      ],
    });
    const result = await service.findById(16n);
    expect(result.pointsOfInterest).toHaveLength(2);
    expect(result.pointsOfInterest[1]).toMatchObject({
      id: 'recorded:8',
      name: 'Intersection',
    });
  });

  test('publish updates the same ID and no recorded relations', async () => {
    const { service, prisma } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 16n,
      status: 'draft',
      hikeName: 'Recorded',
      description: 'Complete trail',
      maxAltitudeM: 1249,
      durationDays: 1,
      distanceMinKm: 2,
      distanceMaxKm: 3,
      walkingTimeMinMinutes: 60,
      walkingTimeMaxMinutes: 90,
      difficulty: 'moderate',
      activity: 'hiking',
      routeFileContent: 'gpx',
      location: { region: 'Kathmandu', country: 'Nepal' },
      itineraryPhases: [{}],
      highlights: [{}],
      pointsOfInterest: [{}],
    } as any);
    await service.togglePublish(16n);
    expect(prisma.trail.update).toHaveBeenCalledWith({
      where: { id: 16n },
      data: { status: 'active', publishedAt: expect.any(Date) },
    });
  });

  test('drafts can remain partial but cannot publish until required fields exist', async () => {
    const { service, prisma } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 16n,
      status: 'draft',
      hikeName: 'Partial',
      description: '',
      location: null,
      itineraryPhases: [],
      highlights: [],
      pointsOfInterest: [],
    } as any);
    await expect(service.publish(16n)).rejects.toThrow(
      'Complete required fields before publishing',
    );
    expect(prisma.trail.update).not.toHaveBeenCalled();
  });

  test('the Flutter nested PATCH shape passes strict DTO validation', async () => {
    const dto = plainToInstance(
      UpdateTrailDto,
      {
        location: { region: 'Kathmandu', country: 'Nepal' },
        itineraryPhases: [
          {
            phaseNumber: 1,
            title: 'Ascent',
            details: [{ detail: 'Ridge', sortOrder: 0 }],
          },
        ],
        pointsOfInterest: [
          {
            id: '44',
            name: 'Summit',
            latitude: 27.7,
            longitude: 85.3,
            distanceKm: 2.3,
            images: ['/uploads/poi.jpg'],
          },
        ],
        recommendedSeasons: [{ season: 'Spring' }],
        safetyItems: [{ type: 'required_gear', text: 'Boots' }],
      },
      { enableImplicitConversion: true },
    );
    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
  });

  test('recorded GPX preserves distinct sessions', () => {
    const point = {
      latitude: 0,
      longitude: 0,
      elevation: 0,
      timestamp: new Date('2026-09-16T00:00:00Z'),
    };
    const xml = recordedGpx('Trail', [
      { trackPoints: [point] },
      { trackPoints: [point] },
    ]);
    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(xml).toContain('<ele>0</ele>');
  });
});

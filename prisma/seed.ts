import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hiking_db';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TrailsData {
  trails: TrailItem[];
}

interface TrailItem {
  id: string;
  hike_name: string;
  gpx_file?: string;
  location: {
    region: string;
    country: string;
    distance_from_city_km?: number;
  };
  overview: {
    max_altitude_m?: number;
    duration?: string;
    difficulty?: string;
    difficulty_rating?: number;
    distance_round_trip_km?: string;
    total_walking_time?: string;
  };
  rating: {
    average?: number;
    review_count?: number;
    breakdown?: Record<string, number>;
  };
  description?: string;
  transportation?: {
    private_option?: string;
    public_option?: string;
    return?: string;
  };
  itinerary_phases?: Array<{
    phase: number;
    title: string;
    duration?: string;
    altitude_m?: number;
    details?: string[];
  }>;
  highlights?: string[];
  points_of_interest?: Array<{
    name: string;
    distance_km?: number;
    icon?: string;
    altitude_m?: number;
    description?: string;
    images?: string[];
    facilities?: string[];
  }>;
  cost_details?: {
    includes?: string[];
    excludes?: string[];
  };
  media?: {
    cover_image?: string;
    route_image?: string;
    gallery?: string[];
  };
  status?: string;
  last_updated?: string;
}

// Helper to convert slug-like ID to slug format
function createSlug(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '-');
}

// Helper to parse duration string to days
function parseDurationToDays(duration: string): number | null {
  if (!duration) return null;

  const dayMatch = duration.match(/(\d+)\s*[Dd]ay/);
  if (dayMatch) return parseFloat(dayMatch[1]);

  return null;
}

// Helper to parse walking time
function parseWalkingTimeToMinutes(timeStr: string): { min: number; max: number } | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d+)-?(\d*)\s*(?:hours?|hrs?)/i);
  if (match) {
    const min = parseFloat(match[1]) * 60;
    const max = match[2] ? parseFloat(match[2]) * 60 : min;
    return { min: Math.round(min), max: Math.round(max) };
  }

  return null;
}

// Helper to parse distance
function parseDistance(distStr: string | number | undefined): { min: number; max: number } | null {
  if (!distStr) return null;

  const str = String(distStr);
  const match = str.match(/(\d+(?:\.\d+)?)-?(\d*(?:\.\d+)?)/);
  if (match) {
    const min = parseFloat(match[1]);
    const max = match[2] ? parseFloat(match[2]) : min;
    return { min, max };
  }

  return null;
}

// Helper to map difficulty string to enum
function mapDifficultyLevel(difficulty: string): string | null {
  if (!difficulty) return null;

  const normalized = difficulty.toLowerCase();

  if (normalized.includes('expert')) return 'expert';
  if (normalized.includes('difficult') && !normalized.includes('moderate')) return 'difficult';
  if (normalized.includes('moderate') && normalized.includes('difficult')) return 'moderate_to_difficult';
  if (normalized.includes('moderate') && normalized.includes('easy')) return 'easy_to_moderate';
  if (normalized.includes('moderate')) return 'moderate';
  if (normalized.includes('easy')) return 'easy';

  return null;
}

async function main() {
  try {
    console.log('🌱 Starting database seed...');

    // Read trails JSON file
    const trailsPath = path.join(__dirname, '..', 'trails_list.json');
    const fileContent = fs.readFileSync(trailsPath, 'utf-8');
    const data: TrailsData = JSON.parse(fileContent);

    console.log(`📖 Found ${data.trails.length} trails to seed`);

    // Process each trail
    for (const trailData of data.trails) {
      try {
        console.log(`\n📍 Processing: ${trailData.hike_name}`);

        // Create slug from ID
        const slug = createSlug(trailData.id);

        // Parse duration
        const durationDays = parseDurationToDays(trailData.overview?.duration || '');
        const walkingTime = parseWalkingTimeToMinutes(trailData.overview?.total_walking_time || '');
        const distance = parseDistance(trailData.overview?.distance_round_trip_km || '');
        const difficulty = mapDifficultyLevel(trailData.overview?.difficulty || '');

        // Create Trail
        const trail = await prisma.trail.create({
          data: {
            slug,
            hikeName: trailData.hike_name,
            description: trailData.description || '',
            routeFilePath: trailData.gpx_file,
            routeFileType: trailData.gpx_file ? 'gpx' : undefined,
            maxAltitudeM: trailData.overview?.max_altitude_m,
            durationLabel: trailData.overview?.duration,
            durationDays: durationDays ? durationDays : undefined,
            difficulty: difficulty as any,
            difficultyLabel: trailData.overview?.difficulty,
            difficultyRating: trailData.overview?.difficulty_rating || undefined,
            activity: 'hiking',
            distanceMinKm: distance?.min || undefined,
            distanceMaxKm: distance?.max || undefined,
            walkingTimeMinMinutes: walkingTime?.min,
            walkingTimeMaxMinutes: walkingTime?.max,
            status: (trailData.status === 'active' ? 'active' : 'draft') as any,
            publishedAt: trailData.status === 'active' ? new Date() : undefined,
          },
        });

        console.log(`   ✓ Trail created (ID: ${trail.id})`);

        // Create Trail Location
        if (trailData.location) {
          await prisma.trailLocation.create({
            data: {
              trailId: trail.id,
              region: trailData.location.region,
              country: trailData.location.country,
              distanceFromCityKm: trailData.location.distance_from_city_km || undefined,
            },
          });
          console.log(`   ✓ Location added`);
        }

        // Create Trail Transportation
        if (trailData.transportation) {
          await prisma.trailTransportation.create({
            data: {
              trailId: trail.id,
              privateOption: trailData.transportation.private_option,
              publicOption: trailData.transportation.public_option,
              returnOption: trailData.transportation.return,
            },
          });
          console.log(`   ✓ Transportation added`);
        }

        // Create Trail Rating Summary
        if (trailData.rating && trailData.rating.average) {
          const ratingSummary = await prisma.trailRatingSummary.create({
            data: {
              trailId: trail.id,
              average: trailData.rating.average,
              reviewCount: trailData.rating.review_count || 0,
            },
          });

          // Create Rating Breakdown
          if (trailData.rating.breakdown) {
            for (const [stars, count] of Object.entries(trailData.rating.breakdown)) {
              await prisma.trailRatingBreakdown.create({
                data: {
                  ratingSummaryId: ratingSummary.id,
                  stars: parseInt(stars),
                  value: count as number,
                },
              });
            }
          }
          console.log(`   ✓ Rating summary added`);
        }

        // Create Itinerary Phases
        if (trailData.itinerary_phases && Array.isArray(trailData.itinerary_phases)) {
          for (const phase of trailData.itinerary_phases) {
            const itineraryPhase = await prisma.itineraryPhase.create({
              data: {
                trailId: trail.id,
                phaseNumber: phase.phase,
                title: phase.title,
                durationLabel: phase.duration,
                altitudeM: phase.altitude_m,
                sortOrder: phase.phase - 1,
              },
            });

            // Create Phase Details
            if (phase.details && Array.isArray(phase.details)) {
              for (let idx = 0; idx < phase.details.length; idx++) {
                await prisma.itineraryPhaseDetail.create({
                  data: {
                    phaseId: itineraryPhase.id,
                    detail: phase.details[idx],
                    sortOrder: idx,
                  },
                });
              }
            }
          }
          console.log(`   ✓ Itinerary phases added`);
        }

        // Create Highlights
        if (trailData.highlights && Array.isArray(trailData.highlights)) {
          for (let idx = 0; idx < trailData.highlights.length; idx++) {
            await prisma.trailHighlight.create({
              data: {
                trailId: trail.id,
                text: trailData.highlights[idx],
                sortOrder: idx,
              },
            });
          }
          console.log(`   ✓ Highlights added`);
        }

        // Create Points of Interest
        if (trailData.points_of_interest && Array.isArray(trailData.points_of_interest)) {
          for (let idx = 0; idx < trailData.points_of_interest.length; idx++) {
            const poi = trailData.points_of_interest[idx];
            await prisma.pointOfInterest.create({
              data: {
                trailId: trail.id,
                name: poi.name,
                description: poi.description,
                distanceKm: poi.distance_km || undefined,
                icon: poi.icon,
                altitudeM: poi.altitude_m,
                images: poi.images || [],
                facilities: poi.facilities || [],
                sortOrder: idx,
              },
            });
          }
          console.log(`   ✓ Points of interest added`);
        }

        // Create Cost Items
        if (trailData.cost_details) {
          if (trailData.cost_details.includes) {
            for (let idx = 0; idx < trailData.cost_details.includes.length; idx++) {
              await prisma.trailCostItem.create({
                data: {
                  trailId: trail.id,
                  type: 'included',
                  text: trailData.cost_details.includes[idx],
                  sortOrder: idx,
                },
              });
            }
          }

          if (trailData.cost_details.excludes) {
            for (let idx = 0; idx < trailData.cost_details.excludes.length; idx++) {
              await prisma.trailCostItem.create({
                data: {
                  trailId: trail.id,
                  type: 'excluded',
                  text: trailData.cost_details.excludes[idx],
                  sortOrder: idx,
                },
              });
            }
          }
          console.log(`   ✓ Cost items added`);
        }

        // Create Media
        if (trailData.media) {
          let mediaIndex = 0;

          if (trailData.media.cover_image) {
            await prisma.trailMedia.create({
              data: {
                trailId: trail.id,
                type: 'cover',
                url: trailData.media.cover_image,
                sortOrder: mediaIndex++,
              },
            });
          }

          if (trailData.media.route_image) {
            await prisma.trailMedia.create({
              data: {
                trailId: trail.id,
                type: 'route',
                url: trailData.media.route_image,
                sortOrder: mediaIndex++,
              },
            });
          }

          if (trailData.media.gallery && Array.isArray(trailData.media.gallery)) {
            for (const galleryUrl of trailData.media.gallery) {
              await prisma.trailMedia.create({
                data: {
                  trailId: trail.id,
                  type: 'gallery',
                  url: galleryUrl,
                  sortOrder: mediaIndex++,
                },
              });
            }
          }
          console.log(`   ✓ Media added`);
        }

        console.log(`✅ ${trailData.hike_name} completed`);
      } catch (error) {
        console.error(`❌ Error processing ${trailData.hike_name}:`, error);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

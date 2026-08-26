import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hiking_db';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('🧹 Cleaning up database...');

    await prisma.pointOfInterest.deleteMany({});
    await prisma.trailMedia.deleteMany({});
    await prisma.trailSafetyItem.deleteMany({});
    await prisma.trailAvoidedMonth.deleteMany({});
    await prisma.trailRecommendedSeason.deleteMany({});
    await prisma.trailCostItem.deleteMany({});
    await prisma.itineraryPhaseDetail.deleteMany({});
    await prisma.itineraryPhase.deleteMany({});
    await prisma.trailHighlight.deleteMany({});
    await prisma.trailReview.deleteMany({});
    await prisma.trailFavourite.deleteMany({});
    await prisma.trailRatingBreakdown.deleteMany({});
    await prisma.trailRatingSummary.deleteMany({});
    await prisma.trailTransportation.deleteMany({});
    await prisma.trailLocation.deleteMany({});
    await prisma.trail.deleteMany({});

    console.log('✅ Database cleaned successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

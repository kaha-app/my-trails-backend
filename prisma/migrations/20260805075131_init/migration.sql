/*
  Warnings:

  - You are about to alter the column `fullName` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `phone` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `passwordHash` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- CreateEnum
CREATE TYPE "TrailStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('easy', 'easy_to_moderate', 'moderate', 'moderate_to_difficult', 'difficult', 'expert');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('hiking', 'trekking', 'walking', 'trail_running', 'sightseeing', 'other');

-- CreateEnum
CREATE TYPE "RouteFileType" AS ENUM ('gpx', 'kmz', 'kml', 'geojson', 'other');

-- CreateEnum
CREATE TYPE "TrailMediaType" AS ENUM ('cover', 'route', 'gallery', 'video');

-- CreateEnum
CREATE TYPE "CostItemType" AS ENUM ('included', 'excluded');

-- CreateEnum
CREATE TYPE "SafetyItemType" AS ENUM ('precaution', 'required_gear');

-- CreateEnum
CREATE TYPE "RatingBreakdownType" AS ENUM ('count', 'percentage');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "fullName" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "passwordHash" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "Trail" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "hikeName" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "routeFilePath" TEXT,
    "routeFileType" "RouteFileType",
    "maxAltitudeM" INTEGER,
    "durationLabel" VARCHAR(100),
    "durationDays" DECIMAL(5,2),
    "difficulty" "DifficultyLevel",
    "difficultyLabel" VARCHAR(100),
    "difficultyRating" DECIMAL(3,2),
    "activity" "ActivityType" NOT NULL DEFAULT 'hiking',
    "distanceMinKm" DECIMAL(8,2),
    "distanceMaxKm" DECIMAL(8,2),
    "walkingTimeMinMinutes" INTEGER,
    "walkingTimeMaxMinutes" INTEGER,
    "groupSizeLimit" INTEGER,
    "entryPermitRequired" BOOLEAN NOT NULL DEFAULT false,
    "fitnessRequirement" TEXT,
    "bestTimeNotes" TEXT,
    "status" "TrailStatus" NOT NULL DEFAULT 'draft',
    "sourceUpdatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailLocation" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "startPoint" VARCHAR(255),
    "endPoint" VARCHAR(255),
    "distanceFromCityKm" DECIMAL(8,2),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailTransportation" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "privateOption" TEXT,
    "publicOption" TEXT,
    "returnOption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailTransportation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailRatingSummary" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "average" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "breakdownType" "RatingBreakdownType" NOT NULL DEFAULT 'count',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailRatingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailRatingBreakdown" (
    "id" BIGSERIAL NOT NULL,
    "ratingSummaryId" BIGINT NOT NULL,
    "stars" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailRatingBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryPhase" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "durationLabel" VARCHAR(100),
    "durationMinutes" INTEGER,
    "altitudeM" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryPhaseDetail" (
    "id" BIGSERIAL NOT NULL,
    "phaseId" BIGINT NOT NULL,
    "detail" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryPhaseDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailHighlight" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointOfInterest" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "distanceKm" DECIMAL(8,2),
    "icon" VARCHAR(100),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailCostItem" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "type" "CostItemType" NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailRecommendedSeason" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "season" VARCHAR(50) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailRecommendedSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailAvoidedMonth" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "monthNumber" INTEGER,
    "monthLabel" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailAvoidedMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailSafetyItem" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "type" "SafetyItemType" NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailSafetyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailMedia" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "type" "TrailMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "altText" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailReview" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(150),
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "visitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailFavourite" (
    "id" BIGSERIAL NOT NULL,
    "trailId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailFavourite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" BIGSERIAL NOT NULL,
    "adminUserId" BIGINT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(80),
    "entityId" BIGINT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trail_slug_key" ON "Trail"("slug");

-- CreateIndex
CREATE INDEX "Trail_slug_idx" ON "Trail"("slug");

-- CreateIndex
CREATE INDEX "Trail_status_idx" ON "Trail"("status");

-- CreateIndex
CREATE INDEX "Trail_activity_idx" ON "Trail"("activity");

-- CreateIndex
CREATE INDEX "Trail_difficulty_idx" ON "Trail"("difficulty");

-- CreateIndex
CREATE INDEX "Trail_maxAltitudeM_idx" ON "Trail"("maxAltitudeM");

-- CreateIndex
CREATE INDEX "Trail_status_activity_idx" ON "Trail"("status", "activity");

-- CreateIndex
CREATE INDEX "Trail_status_difficulty_idx" ON "Trail"("status", "difficulty");

-- CreateIndex
CREATE INDEX "Trail_status_publishedAt_idx" ON "Trail"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrailLocation_trailId_key" ON "TrailLocation"("trailId");

-- CreateIndex
CREATE INDEX "TrailLocation_trailId_idx" ON "TrailLocation"("trailId");

-- CreateIndex
CREATE INDEX "TrailLocation_country_idx" ON "TrailLocation"("country");

-- CreateIndex
CREATE INDEX "TrailLocation_region_idx" ON "TrailLocation"("region");

-- CreateIndex
CREATE INDEX "TrailLocation_country_region_idx" ON "TrailLocation"("country", "region");

-- CreateIndex
CREATE UNIQUE INDEX "TrailTransportation_trailId_key" ON "TrailTransportation"("trailId");

-- CreateIndex
CREATE INDEX "TrailTransportation_trailId_idx" ON "TrailTransportation"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "TrailRatingSummary_trailId_key" ON "TrailRatingSummary"("trailId");

-- CreateIndex
CREATE INDEX "TrailRatingSummary_trailId_idx" ON "TrailRatingSummary"("trailId");

-- CreateIndex
CREATE INDEX "TrailRatingSummary_average_idx" ON "TrailRatingSummary"("average");

-- CreateIndex
CREATE INDEX "TrailRatingSummary_reviewCount_idx" ON "TrailRatingSummary"("reviewCount");

-- CreateIndex
CREATE INDEX "TrailRatingBreakdown_ratingSummaryId_idx" ON "TrailRatingBreakdown"("ratingSummaryId");

-- CreateIndex
CREATE INDEX "TrailRatingBreakdown_stars_idx" ON "TrailRatingBreakdown"("stars");

-- CreateIndex
CREATE UNIQUE INDEX "TrailRatingBreakdown_ratingSummaryId_stars_key" ON "TrailRatingBreakdown"("ratingSummaryId", "stars");

-- CreateIndex
CREATE INDEX "ItineraryPhase_trailId_idx" ON "ItineraryPhase"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryPhase_trailId_phaseNumber_key" ON "ItineraryPhase"("trailId", "phaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryPhase_trailId_sortOrder_key" ON "ItineraryPhase"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "ItineraryPhaseDetail_phaseId_idx" ON "ItineraryPhaseDetail"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryPhaseDetail_phaseId_sortOrder_key" ON "ItineraryPhaseDetail"("phaseId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailHighlight_trailId_idx" ON "TrailHighlight"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "TrailHighlight_trailId_sortOrder_key" ON "TrailHighlight"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "PointOfInterest_trailId_idx" ON "PointOfInterest"("trailId");

-- CreateIndex
CREATE INDEX "PointOfInterest_trailId_distanceKm_idx" ON "PointOfInterest"("trailId", "distanceKm");

-- CreateIndex
CREATE UNIQUE INDEX "PointOfInterest_trailId_sortOrder_key" ON "PointOfInterest"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailCostItem_trailId_idx" ON "TrailCostItem"("trailId");

-- CreateIndex
CREATE INDEX "TrailCostItem_type_idx" ON "TrailCostItem"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TrailCostItem_trailId_type_sortOrder_key" ON "TrailCostItem"("trailId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailRecommendedSeason_trailId_idx" ON "TrailRecommendedSeason"("trailId");

-- CreateIndex
CREATE INDEX "TrailRecommendedSeason_sortOrder_idx" ON "TrailRecommendedSeason"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrailRecommendedSeason_trailId_season_key" ON "TrailRecommendedSeason"("trailId", "season");

-- CreateIndex
CREATE INDEX "TrailAvoidedMonth_trailId_idx" ON "TrailAvoidedMonth"("trailId");

-- CreateIndex
CREATE INDEX "TrailAvoidedMonth_sortOrder_idx" ON "TrailAvoidedMonth"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrailAvoidedMonth_trailId_monthLabel_key" ON "TrailAvoidedMonth"("trailId", "monthLabel");

-- CreateIndex
CREATE INDEX "TrailSafetyItem_trailId_idx" ON "TrailSafetyItem"("trailId");

-- CreateIndex
CREATE INDEX "TrailSafetyItem_type_idx" ON "TrailSafetyItem"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TrailSafetyItem_trailId_type_sortOrder_key" ON "TrailSafetyItem"("trailId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailMedia_trailId_idx" ON "TrailMedia"("trailId");

-- CreateIndex
CREATE INDEX "TrailMedia_type_idx" ON "TrailMedia"("type");

-- CreateIndex
CREATE INDEX "TrailMedia_trailId_type_sortOrder_idx" ON "TrailMedia"("trailId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailReview_trailId_idx" ON "TrailReview"("trailId");

-- CreateIndex
CREATE INDEX "TrailReview_userId_idx" ON "TrailReview"("userId");

-- CreateIndex
CREATE INDEX "TrailReview_status_idx" ON "TrailReview"("status");

-- CreateIndex
CREATE INDEX "TrailReview_rating_idx" ON "TrailReview"("rating");

-- CreateIndex
CREATE INDEX "TrailReview_trailId_status_idx" ON "TrailReview"("trailId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrailReview_userId_trailId_key" ON "TrailReview"("userId", "trailId");

-- CreateIndex
CREATE INDEX "TrailFavourite_trailId_idx" ON "TrailFavourite"("trailId");

-- CreateIndex
CREATE INDEX "TrailFavourite_userId_idx" ON "TrailFavourite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrailFavourite_userId_trailId_key" ON "TrailFavourite"("userId", "trailId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_idx" ON "AdminAuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "TrailLocation" ADD CONSTRAINT "TrailLocation_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailTransportation" ADD CONSTRAINT "TrailTransportation_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailRatingSummary" ADD CONSTRAINT "TrailRatingSummary_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailRatingBreakdown" ADD CONSTRAINT "TrailRatingBreakdown_ratingSummaryId_fkey" FOREIGN KEY ("ratingSummaryId") REFERENCES "TrailRatingSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryPhase" ADD CONSTRAINT "ItineraryPhase_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryPhaseDetail" ADD CONSTRAINT "ItineraryPhaseDetail_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ItineraryPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailHighlight" ADD CONSTRAINT "TrailHighlight_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailCostItem" ADD CONSTRAINT "TrailCostItem_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailRecommendedSeason" ADD CONSTRAINT "TrailRecommendedSeason_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailAvoidedMonth" ADD CONSTRAINT "TrailAvoidedMonth_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailSafetyItem" ADD CONSTRAINT "TrailSafetyItem_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailMedia" ADD CONSTRAINT "TrailMedia_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailReview" ADD CONSTRAINT "TrailReview_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailReview" ADD CONSTRAINT "TrailReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailFavourite" ADD CONSTRAINT "TrailFavourite_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailFavourite" ADD CONSTRAINT "TrailFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

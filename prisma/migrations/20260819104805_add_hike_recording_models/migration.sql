/*
  Warnings:

  - A unique constraint covering the columns `[trailId,sortOrder]` on the table `ItineraryPhase` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trailId,sortOrder]` on the table `PointOfInterest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trailId,sortOrder]` on the table `TrailHighlight` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "HikePoiType" AS ENUM ('viewpoint', 'restArea', 'waterSource', 'campsite', 'landmark', 'danger', 'parking', 'trailhead', 'junction', 'shelter', 'bridge', 'summit', 'other');

-- DropIndex
DROP INDEX "ItineraryPhase_sortOrder_idx";

-- DropIndex
DROP INDEX "PointOfInterest_trailId_sortOrder_idx";

-- DropIndex
DROP INDEX "TrailAvoidedMonth_trailId_sortOrder_idx";

-- DropIndex
DROP INDEX "TrailHighlight_trailId_sortOrder_idx";

-- DropIndex
DROP INDEX "TrailRecommendedSeason_trailId_sortOrder_idx";

-- CreateTable
CREATE TABLE "HikeSession" (
    "id" TEXT NOT NULL,
    "trailId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "RecordingStatus" NOT NULL DEFAULT 'active',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "totalDistance" DECIMAL(10,2),
    "totalAltitude" INTEGER,
    "maxAltitude" INTEGER,
    "minAltitude" INTEGER,
    "currentAltitude" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPoint" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "latitude" DECIMAL(11,8) NOT NULL,
    "longitude" DECIMAL(12,8) NOT NULL,
    "elevation" DECIMAL(10,2),
    "accuracy" DECIMAL(7,2),
    "heading" DECIMAL(6,2),
    "speed" DECIMAL(7,2),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "distanceSinceLastPoint" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikeWaypoint" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "trailId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" VARCHAR(50),
    "description" VARCHAR(200),
    "type" "HikePoiType" NOT NULL,
    "latitude" DECIMAL(11,8) NOT NULL,
    "longitude" DECIMAL(12,8) NOT NULL,
    "elevation" DECIMAL(10,2),
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" VARCHAR(150),
    "distanceFromStart" DECIMAL(10,2),
    "durationAtStart" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikeWaypointPhoto" (
    "id" BIGSERIAL NOT NULL,
    "waypointId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "photoUrl" VARCHAR(500) NOT NULL,
    "thumbnail" VARCHAR(500),
    "latitude" DECIMAL(11,8),
    "longitude" DECIMAL(12,8),
    "elevation" DECIMAL(10,2),
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HikeWaypointPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HikeSession_userId_idx" ON "HikeSession"("userId");

-- CreateIndex
CREATE INDEX "HikeSession_trailId_idx" ON "HikeSession"("trailId");

-- CreateIndex
CREATE INDEX "HikeSession_status_idx" ON "HikeSession"("status");

-- CreateIndex
CREATE INDEX "HikeSession_startTime_idx" ON "HikeSession"("startTime");

-- CreateIndex
CREATE INDEX "HikeSession_userId_startTime_idx" ON "HikeSession"("userId", "startTime");

-- CreateIndex
CREATE INDEX "HikeSession_trailId_startTime_idx" ON "HikeSession"("trailId", "startTime");

-- CreateIndex
CREATE INDEX "TrackPoint_sessionId_idx" ON "TrackPoint"("sessionId");

-- CreateIndex
CREATE INDEX "TrackPoint_timestamp_idx" ON "TrackPoint"("timestamp");

-- CreateIndex
CREATE INDEX "HikeWaypoint_sessionId_idx" ON "HikeWaypoint"("sessionId");

-- CreateIndex
CREATE INDEX "HikeWaypoint_trailId_idx" ON "HikeWaypoint"("trailId");

-- CreateIndex
CREATE INDEX "HikeWaypoint_userId_idx" ON "HikeWaypoint"("userId");

-- CreateIndex
CREATE INDEX "HikeWaypoint_type_idx" ON "HikeWaypoint"("type");

-- CreateIndex
CREATE INDEX "HikeWaypoint_sessionId_timestamp_idx" ON "HikeWaypoint"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "HikeWaypointPhoto_waypointId_idx" ON "HikeWaypointPhoto"("waypointId");

-- CreateIndex
CREATE INDEX "HikeWaypointPhoto_userId_idx" ON "HikeWaypointPhoto"("userId");

-- CreateIndex
CREATE INDEX "HikeWaypointPhoto_timestamp_idx" ON "HikeWaypointPhoto"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryPhase_trailId_sortOrder_key" ON "ItineraryPhase"("trailId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PointOfInterest_trailId_sortOrder_key" ON "PointOfInterest"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailAvoidedMonth_sortOrder_idx" ON "TrailAvoidedMonth"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrailHighlight_trailId_sortOrder_key" ON "TrailHighlight"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailRecommendedSeason_sortOrder_idx" ON "TrailRecommendedSeason"("sortOrder");

-- AddForeignKey
ALTER TABLE "HikeSession" ADD CONSTRAINT "HikeSession_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeSession" ADD CONSTRAINT "HikeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPoint" ADD CONSTRAINT "TrackPoint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HikeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeWaypoint" ADD CONSTRAINT "HikeWaypoint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HikeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeWaypoint" ADD CONSTRAINT "HikeWaypoint_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeWaypoint" ADD CONSTRAINT "HikeWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeWaypointPhoto" ADD CONSTRAINT "HikeWaypointPhoto_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "HikeWaypoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeWaypointPhoto" ADD CONSTRAINT "HikeWaypointPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

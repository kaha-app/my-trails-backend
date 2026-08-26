-- DropIndex
DROP INDEX "ItineraryPhase_trailId_sortOrder_key";

-- DropIndex
DROP INDEX "PointOfInterest_trailId_sortOrder_key";

-- DropIndex
DROP INDEX "TrailAvoidedMonth_sortOrder_idx";

-- DropIndex
DROP INDEX "TrailHighlight_trailId_sortOrder_key";

-- DropIndex
DROP INDEX "TrailRecommendedSeason_sortOrder_idx";

-- CreateIndex
CREATE INDEX "ItineraryPhase_sortOrder_idx" ON "ItineraryPhase"("sortOrder");

-- CreateIndex
CREATE INDEX "PointOfInterest_trailId_sortOrder_idx" ON "PointOfInterest"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailAvoidedMonth_trailId_sortOrder_idx" ON "TrailAvoidedMonth"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailHighlight_trailId_sortOrder_idx" ON "TrailHighlight"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrailRecommendedSeason_trailId_sortOrder_idx" ON "TrailRecommendedSeason"("trailId", "sortOrder");

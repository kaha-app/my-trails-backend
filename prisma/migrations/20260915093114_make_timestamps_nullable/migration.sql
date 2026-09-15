-- AlterTable
ALTER TABLE "HikeWaypoint" ALTER COLUMN "timestamp" DROP NOT NULL;

-- AlterTable
ALTER TABLE "HikeWaypointPhoto" ALTER COLUMN "timestamp" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PointOfInterest" ADD COLUMN     "type" VARCHAR(50);

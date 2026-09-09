-- DropIndex
DROP INDEX "HikeSyncTracker_sessionId_key";

-- AlterTable
ALTER TABLE "HikeSyncTracker" ALTER COLUMN "sessionId" DROP NOT NULL;

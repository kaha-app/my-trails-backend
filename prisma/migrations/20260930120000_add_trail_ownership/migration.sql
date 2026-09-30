ALTER TABLE "Trail" ADD COLUMN "ownerUserId" BIGINT;

UPDATE "Trail" AS trail
SET "ownerUserId" = tracker."ownerUserId"
FROM "HikeSyncTracker" AS tracker
WHERE tracker."serverId" ~ '^[0-9]+$'
  AND tracker."serverId"::BIGINT = trail."id";

ALTER TABLE "Trail"
ADD CONSTRAINT "Trail_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Trail_ownerUserId_status_idx" ON "Trail"("ownerUserId", "status");

CREATE TABLE "HikeSyncStatus" (
  "id" BIGSERIAL PRIMARY KEY,
  "sessionId" TEXT NOT NULL UNIQUE,
  "userId" BIGINT NOT NULL,
  "isSynced" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAttempt" TIMESTAMP(3),
  "lastSyncSuccess" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HikeSyncStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HikeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HikeSyncStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HikeSyncStatus_userId_isSynced_idx" ON "HikeSyncStatus"("userId", "isSynced");

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'synced', 'failed');

-- CreateEnum
CREATE TYPE "QueueEventType" AS ENUM ('create', 'update', 'delete');

-- DropIndex
DROP INDEX "ItineraryPhase_trailId_sortOrder_key";

-- DropIndex
DROP INDEX "PointOfInterest_trailId_sortOrder_key";

-- DropIndex
DROP INDEX "TrailHighlight_trailId_sortOrder_key";

-- CreateTable
CREATE TABLE "HikeSyncStatus" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "localHikeId" VARCHAR(100),
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAttempt" TIMESTAMP(3),
    "lastSyncSuccess" TIMESTAMP(3),
    "syncFailureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeSyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxQueue" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "eventType" "QueueEventType" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetryQueue" (
    "id" BIGSERIAL NOT NULL,
    "outboxQueueId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "QueueEventType" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3) NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetryQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcknowledgementQueue" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "outboxQueueId" BIGINT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "acknowledgedData" JSONB,
    "conflictResolution" JSONB,
    "isConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictType" VARCHAR(100),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcknowledgementQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HikeSyncStatus_sessionId_key" ON "HikeSyncStatus"("sessionId");

-- CreateIndex
CREATE INDEX "HikeSyncStatus_userId_idx" ON "HikeSyncStatus"("userId");

-- CreateIndex
CREATE INDEX "HikeSyncStatus_isSynced_idx" ON "HikeSyncStatus"("isSynced");

-- CreateIndex
CREATE INDEX "HikeSyncStatus_sessionId_idx" ON "HikeSyncStatus"("sessionId");

-- CreateIndex
CREATE INDEX "HikeSyncStatus_isSynced_retryCount_idx" ON "HikeSyncStatus"("isSynced", "retryCount");

-- CreateIndex
CREATE INDEX "OutboxQueue_userId_idx" ON "OutboxQueue"("userId");

-- CreateIndex
CREATE INDEX "OutboxQueue_status_idx" ON "OutboxQueue"("status");

-- CreateIndex
CREATE INDEX "OutboxQueue_sessionId_idx" ON "OutboxQueue"("sessionId");

-- CreateIndex
CREATE INDEX "OutboxQueue_createdAt_idx" ON "OutboxQueue"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxQueue_status_createdAt_idx" ON "OutboxQueue"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetryQueue_outboxQueueId_key" ON "RetryQueue"("outboxQueueId");

-- CreateIndex
CREATE INDEX "RetryQueue_userId_idx" ON "RetryQueue"("userId");

-- CreateIndex
CREATE INDEX "RetryQueue_status_idx" ON "RetryQueue"("status");

-- CreateIndex
CREATE INDEX "RetryQueue_nextRetryAt_idx" ON "RetryQueue"("nextRetryAt");

-- CreateIndex
CREATE INDEX "RetryQueue_retryCount_idx" ON "RetryQueue"("retryCount");

-- CreateIndex
CREATE INDEX "AcknowledgementQueue_userId_idx" ON "AcknowledgementQueue"("userId");

-- CreateIndex
CREATE INDEX "AcknowledgementQueue_sessionId_idx" ON "AcknowledgementQueue"("sessionId");

-- CreateIndex
CREATE INDEX "AcknowledgementQueue_status_idx" ON "AcknowledgementQueue"("status");

-- CreateIndex
CREATE INDEX "AcknowledgementQueue_isConflict_idx" ON "AcknowledgementQueue"("isConflict");

-- CreateIndex
CREATE INDEX "AcknowledgementQueue_createdAt_idx" ON "AcknowledgementQueue"("createdAt");

-- AddForeignKey
ALTER TABLE "HikeSyncStatus" ADD CONSTRAINT "HikeSyncStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HikeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeSyncStatus" ADD CONSTRAINT "HikeSyncStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxQueue" ADD CONSTRAINT "OutboxQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetryQueue" ADD CONSTRAINT "RetryQueue_outboxQueueId_fkey" FOREIGN KEY ("outboxQueueId") REFERENCES "OutboxQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetryQueue" ADD CONSTRAINT "RetryQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcknowledgementQueue" ADD CONSTRAINT "AcknowledgementQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

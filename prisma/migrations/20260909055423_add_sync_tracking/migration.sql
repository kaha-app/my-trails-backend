/*
  Warnings:

  - You are about to drop the `AcknowledgementQueue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HikeSyncStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutboxQueue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RetryQueue` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SyncStatus" ADD VALUE 'uploading';
ALTER TYPE "SyncStatus" ADD VALUE 'conflict';

-- DropForeignKey
ALTER TABLE "AcknowledgementQueue" DROP CONSTRAINT "AcknowledgementQueue_userId_fkey";

-- DropForeignKey
ALTER TABLE "HikeSyncStatus" DROP CONSTRAINT "HikeSyncStatus_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "HikeSyncStatus" DROP CONSTRAINT "HikeSyncStatus_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutboxQueue" DROP CONSTRAINT "OutboxQueue_userId_fkey";

-- DropForeignKey
ALTER TABLE "RetryQueue" DROP CONSTRAINT "RetryQueue_outboxQueueId_fkey";

-- DropForeignKey
ALTER TABLE "RetryQueue" DROP CONSTRAINT "RetryQueue_userId_fkey";

-- DropTable
DROP TABLE "AcknowledgementQueue";

-- DropTable
DROP TABLE "HikeSyncStatus";

-- DropTable
DROP TABLE "OutboxQueue";

-- DropTable
DROP TABLE "RetryQueue";

-- DropEnum
DROP TYPE "QueueEventType";

-- CreateTable
CREATE TABLE "HikeSyncTracker" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "ownerUserId" BIGINT NOT NULL,
    "serverId" TEXT,
    "localRevision" INTEGER NOT NULL DEFAULT 1,
    "syncedRevision" INTEGER,
    "serverVersion" INTEGER,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'pending',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "multiDayHikeSyncId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeSyncTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMediaMapping" (
    "id" BIGSERIAL NOT NULL,
    "hikeSyncTrackerId" BIGINT NOT NULL,
    "localPath" VARCHAR(500) NOT NULL,
    "clientMediaUuid" TEXT NOT NULL,
    "serverMediaId" TEXT,
    "serverMediaUrl" VARCHAR(500),
    "mediaChecksum" VARCHAR(64),
    "uploadStatus" "SyncStatus" NOT NULL DEFAULT 'pending',
    "mediaType" TEXT NOT NULL,
    "waypointClientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncMediaMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJobRecord" (
    "id" BIGSERIAL NOT NULL,
    "hikeSyncTrackerId" BIGINT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "revision" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultiDayHikeSync" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "ownerUserId" BIGINT NOT NULL,
    "serverId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "localRevision" INTEGER NOT NULL DEFAULT 1,
    "syncedRevision" INTEGER,
    "serverVersion" INTEGER,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'pending',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultiDayHikeSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HikeSyncTracker_sessionId_key" ON "HikeSyncTracker"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HikeSyncTracker_clientUuid_key" ON "HikeSyncTracker"("clientUuid");

-- CreateIndex
CREATE INDEX "HikeSyncTracker_userId_idx" ON "HikeSyncTracker"("userId");

-- CreateIndex
CREATE INDEX "HikeSyncTracker_ownerUserId_idx" ON "HikeSyncTracker"("ownerUserId");

-- CreateIndex
CREATE INDEX "HikeSyncTracker_syncStatus_idx" ON "HikeSyncTracker"("syncStatus");

-- CreateIndex
CREATE INDEX "HikeSyncTracker_lastSyncedAt_idx" ON "HikeSyncTracker"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "HikeSyncTracker_multiDayHikeSyncId_idx" ON "HikeSyncTracker"("multiDayHikeSyncId");

-- CreateIndex
CREATE UNIQUE INDEX "HikeSyncTracker_ownerUserId_clientUuid_key" ON "HikeSyncTracker"("ownerUserId", "clientUuid");

-- CreateIndex
CREATE INDEX "SyncMediaMapping_hikeSyncTrackerId_idx" ON "SyncMediaMapping"("hikeSyncTrackerId");

-- CreateIndex
CREATE INDEX "SyncMediaMapping_clientMediaUuid_idx" ON "SyncMediaMapping"("clientMediaUuid");

-- CreateIndex
CREATE INDEX "SyncMediaMapping_uploadStatus_idx" ON "SyncMediaMapping"("uploadStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SyncJobRecord_idempotencyKey_key" ON "SyncJobRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SyncJobRecord_hikeSyncTrackerId_idx" ON "SyncJobRecord"("hikeSyncTrackerId");

-- CreateIndex
CREATE INDEX "SyncJobRecord_status_idx" ON "SyncJobRecord"("status");

-- CreateIndex
CREATE INDEX "SyncJobRecord_revision_idx" ON "SyncJobRecord"("revision");

-- CreateIndex
CREATE UNIQUE INDEX "MultiDayHikeSync_clientUuid_key" ON "MultiDayHikeSync"("clientUuid");

-- CreateIndex
CREATE INDEX "MultiDayHikeSync_userId_idx" ON "MultiDayHikeSync"("userId");

-- CreateIndex
CREATE INDEX "MultiDayHikeSync_ownerUserId_idx" ON "MultiDayHikeSync"("ownerUserId");

-- CreateIndex
CREATE INDEX "MultiDayHikeSync_syncStatus_idx" ON "MultiDayHikeSync"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MultiDayHikeSync_ownerUserId_clientUuid_key" ON "MultiDayHikeSync"("ownerUserId", "clientUuid");

-- AddForeignKey
ALTER TABLE "HikeSyncTracker" ADD CONSTRAINT "HikeSyncTracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeSyncTracker" ADD CONSTRAINT "HikeSyncTracker_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeSyncTracker" ADD CONSTRAINT "HikeSyncTracker_multiDayHikeSyncId_fkey" FOREIGN KEY ("multiDayHikeSyncId") REFERENCES "MultiDayHikeSync"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMediaMapping" ADD CONSTRAINT "SyncMediaMapping_hikeSyncTrackerId_fkey" FOREIGN KEY ("hikeSyncTrackerId") REFERENCES "HikeSyncTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJobRecord" ADD CONSTRAINT "SyncJobRecord_hikeSyncTrackerId_fkey" FOREIGN KEY ("hikeSyncTrackerId") REFERENCES "HikeSyncTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiDayHikeSync" ADD CONSTRAINT "MultiDayHikeSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiDayHikeSync" ADD CONSTRAINT "MultiDayHikeSync_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

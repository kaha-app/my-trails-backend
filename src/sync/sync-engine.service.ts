import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from './outbox.service';
import { RetryService } from './retry.service';
import { AcknowledgementService } from './acknowledgement.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { SyncPayload, SyncResult, SyncError } from './sync.models';

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);
  private prismaAny: any;

  constructor(
    private prisma: PrismaService,
    private outboxService: OutboxService,
    private retryService: RetryService,
    private acknowledgementService: AcknowledgementService,
    private conflictResolver: ConflictResolverService,
  ) {
    this.prismaAny = this.prisma as any;
  }

  /**
   * Main sync orchestrator - entry point for all sync operations
   */
  async startSync(userId: bigint, sessionId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      sessionId: sessionId || '',
      syncedAt: new Date(),
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errors: [],
    };

    try {
      // Step 1: Process automatic retries
      await this.processRetryQueue(userId);

      // Step 2: Get pending items from outbox
      const pendingItems = await this.outboxService.getPendingItems(userId);

      if (pendingItems.length === 0) {
        this.logger.debug(`No pending items to sync for user ${userId}`);
        return result;
      }

      // Step 3: Process each item
      for (const item of pendingItems) {
        result.itemsProcessed++;
        result.sessionId = item.sessionId;

        try {
          await this.processSingleItem(item, userId, result);
        } catch (error) {
          this.logger.error(`Failed to process item ${item.id}:`, error);
          result.itemsFailed++;
          result.errors.push(
            this.retryService.createSyncError(
              error.message,
              'PROCESSING_ERROR',
              this.retryService.isRetriableError(error),
            ),
          );
        }
      }

      result.success = result.itemsFailed === 0;
      return result;
    } catch (error) {
      this.logger.error('Sync engine error:', error);
      result.success = false;
      result.errors.push({
        code: 'SYNC_ENGINE_ERROR',
        message: error.message,
        retriable: true,
      });
      return result;
    }
  }

  /**
   * Process items in retry queue with exponential backoff
   */
  private async processRetryQueue(userId: bigint): Promise<void> {
    const readyItems = await this.retryService.getReadyForRetry(userId);

    for (const item of readyItems) {
      try {
        // Recreate outbox entry data for processing
        const outboxData = await this.prismaAny.outboxQueue.findUnique({
          where: { id: item.outboxQueueId },
        });

        if (!outboxData) {
          this.logger.warn(`Outbox entry ${item.outboxQueueId} not found`);
          continue;
        }

        // Try to sync again
        const result = await this.dispatchToBackend(outboxData, userId);

        if (result.success) {
          // Success - remove from retry queue
          await this.retryService.updateRetryAttempt(item.id, true);
          await this.outboxService.updateStatus(item.outboxQueueId, 'synced');
        } else {
          // Failure - update retry attempt
          const errorMsg = result.error || 'Unknown error';
          await this.retryService.updateRetryAttempt(item.id, false, errorMsg);

          // Check if max retries exhausted
          const updatedEntry = await this.prismaAny.retryQueue.findUnique({
            where: { id: item.id },
          });

          if (updatedEntry.retryCount >= updatedEntry.maxRetries) {
            await this.retryService.markRetryExhausted(
              item.id,
              errorMsg,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Retry processing error for item ${item.id}:`, error);
      }
    }
  }

  /**
   * Process a single outbox item
   */
  private async processSingleItem(
    item: any,
    userId: bigint,
    result: SyncResult,
  ): Promise<void> {
    try {
      // Step 1: Check if item already exists on backend
      const existsResult = await this.checkExistence(item);

      if (existsResult.exists) {
        // Step 2: Check for conflicts
        const conflict = this.conflictResolver.detectConflict(
          item.payload,
          existsResult.remoteData,
        );

        if (conflict) {
          result.conflictsDetected++;
          await this.handleConflict(item, conflict, result);
          return;
        }
      }

      // Step 3: Dispatch to backend
      const dispatchResult = await this.dispatchToBackend(item, userId);

      if (dispatchResult.success) {
        // Step 4: Move to acknowledgement
        await this.acknowledgeSync(
          item,
          dispatchResult.remoteData,
          userId,
        );
        result.itemsSucceeded++;
      } else {
        // Add to retry queue
        await this.addToRetryQueue(item, dispatchResult.error);
      }
    } catch (error) {
      this.logger.error(`Error processing item ${item.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if hike already exists on backend
   */
  private async checkExistence(item: any): Promise<{
    exists: boolean;
    remoteData?: any;
  }> {
    try {
      // Query backend for existing hike
      // This is a placeholder - actual implementation depends on backend API
      const existingHike = await this.prismaAny.hikeSession.findUnique({
        where: { id: item.entityId },
      });

      if (existingHike) {
        return {
          exists: true,
          remoteData: existingHike,
        };
      }

      return { exists: false };
    } catch (error) {
      this.logger.warn('Error checking existence:', error);
      return { exists: false };
    }
  }

  /**
   * Dispatch item to backend for sync
   */
  private async dispatchToBackend(
    item: any,
    userId: bigint,
  ): Promise<{
    success: boolean;
    remoteData?: any;
    error?: string;
  }> {
    try {
      // Operation varies by entity type
      switch (item.eventType) {
        case 'create':
          return await this.dispatchCreate(item.payload, userId);
        case 'update':
          return await this.dispatchUpdate(item.entityId, item.payload, userId);
        case 'delete':
          return await this.dispatchDelete(item.entityId, userId);
        default:
          throw new Error(`Unknown event type: ${item.eventType}`);
      }
    } catch (error) {
      this.logger.error('Dispatch error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle create operation
   */
  private async dispatchCreate(payload: any, userId: bigint): Promise<{
    success: boolean;
    remoteData?: any;
    error?: string;
  }> {
    try {
      // In actual implementation, this would call backend API
      // For now, we confirm creation in local DB
      const createdSession = await this.prismaAny.hikeSession.findUnique({
        where: { id: payload.sessionId },
      });

      return {
        success: true,
        remoteData: createdSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle update operation
   */
  private async dispatchUpdate(
    sessionId: string,
    payload: any,
    userId: bigint,
  ): Promise<{
    success: boolean;
    remoteData?: any;
    error?: string;
  }> {
    try {
      const updatedSession = await this.prismaAny.hikeSession.update({
        where: { id: sessionId },
        data: payload,
      });

      return {
        success: true,
        remoteData: updatedSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle delete operation
   */
  private async dispatchDelete(
    sessionId: string,
    userId: bigint,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.prismaAny.hikeSession.delete({
        where: { id: sessionId },
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflict(
    item: any,
    conflict: any,
    result: SyncResult,
  ): Promise<void> {
    // Auto-resolve using last-write-wins
    const resolved = this.conflictResolver.resolveLastWriteWins(
      item.payload,
      conflict.localVersion,
    );

    // Record conflict resolution
    await this.acknowledgementService.handleConflict(
      item.sessionId,
      item.userId,
      item.id,
      {
        ...conflict,
        resolution: 'last_write_wins',
        resolvedData: resolved,
      },
    );

    // Dispatch resolved data
    const dispatchResult = await this.dispatchToBackend(
      {
        ...item,
        payload: resolved,
      },
      item.userId,
    );

    if (dispatchResult.success) {
      result.conflictsResolved++;
      result.itemsSucceeded++;
      await this.outboxService.updateStatus(item.id, 'synced');
    } else {
      await this.addToRetryQueue(item, dispatchResult.error);
    }
  }

  /**
   * Acknowledge successful sync
   */
  private async acknowledgeSync(
    item: any,
    remoteData: any,
    userId: bigint,
  ): Promise<void> {
    // Update outbox status
    await this.outboxService.updateStatus(item.id, 'synced');

    // Create acknowledgement
    await this.acknowledgementService.createAcknowledgement(
      item.sessionId,
      userId,
      item.id,
      remoteData,
    );

    // Update sync status
    await this.updateSyncStatus(item.sessionId, userId, true);
  }

  /**
   * Add failed item to retry queue
   */
  private async addToRetryQueue(item: any, error: string | undefined): Promise<void> {
    const errorMessage = error || 'Unknown error';
    const isRetriable = this.retryService.isRetriableError({
      message: errorMessage,
    });

    if (isRetriable) {
      await this.retryService.addToRetryQueue(
        item.id,
        item.sessionId,
        item.userId,
        item.eventType,
        item.entityType,
        item.entityId,
        item.payload,
        errorMessage,
      );

      // Keep in pending status
      await this.outboxService.updateStatus(item.id, 'pending', errorMessage);
    } else {
      // Non-retriable error
      await this.outboxService.updateStatus(item.id, 'failed', errorMessage);
    }
  }

  /**
   * Update overall sync status for a session
   */
  private async updateSyncStatus(
    sessionId: string,
    userId: bigint,
    synced: boolean,
  ): Promise<void> {
    const existingStatus = await this.prismaAny.hikeSyncStatus.findUnique({
      where: { sessionId },
    });

    if (existingStatus) {
      await this.prismaAny.hikeSyncStatus.update({
        where: { sessionId },
        data: {
          isSynced: synced,
          lastSyncAttempt: new Date(),
          ...(synced && { lastSyncSuccess: new Date() }),
          retryCount: synced ? 0 : existingStatus.retryCount + 1,
        },
      });
    } else {
      await this.prismaAny.hikeSyncStatus.create({
        data: {
          sessionId,
          userId,
          isSynced: synced,
          lastSyncAttempt: new Date(),
          ...(synced && { lastSyncSuccess: new Date() }),
          retryCount: synced ? 0 : 1,
        },
      });
    }
  }

  /**
   * Get sync status for a session
   */
  async getSyncStatus(sessionId: string) {
    return this.prismaAny.hikeSyncStatus.findUnique({
      where: { sessionId },
    });
  }

  /**
   * Get overall sync statistics for a user
   */
  async getSyncStats(userId: bigint) {
    const pending = await this.outboxService.countPendingItems(userId);
    const retryStats = await this.retryService.getRetryStats(userId);
    const conflicts = await this.acknowledgementService.getPendingConflicts(userId);

    return {
      pendingItems: pending,
      retryQueue: retryStats,
      conflicts: conflicts.length,
    };
  }
}

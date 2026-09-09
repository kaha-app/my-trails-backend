import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RetryEntry, SyncError } from './sync.models';

@Injectable()
export class RetryService {
  private prismaAny: any;

  // Exponential backoff intervals (in seconds)
  private readonly RETRY_INTERVALS = [60, 300, 900]; // 1 min, 5 min, 15 min

  constructor(private prisma: PrismaService) {
    this.prismaAny = this.prisma as any;
  }

  /**
   * Add item to retry queue when sync fails
   */
  async addToRetryQueue(
    outboxQueueId: bigint,
    sessionId: string,
    userId: bigint,
    eventType: string,
    entityType: string,
    entityId: string,
    payload: any,
    error: string,
  ): Promise<RetryEntry> {
    const nextRetryAt = this.calculateNextRetryTime(0);

    return this.prismaAny.retryQueue.create({
      data: {
        outboxQueueId,
        sessionId,
        userId,
        eventType,
        entityType,
        entityId,
        payload,
        lastError: error,
        retryCount: 0,
        maxRetries: 3,
        nextRetryAt,
        status: 'pending',
      },
    });
  }

  /**
   * Get items ready for retry
   */
  async getReadyForRetry(userId?: bigint, limit: number = 10): Promise<RetryEntry[]> {
    const whereClause: any = {
      nextRetryAt: {
        lte: new Date(),
      },
      retryCount: {
        lt: 3, // Max retries
      },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    return this.prismaAny.retryQueue.findMany({
      where: whereClause,
      orderBy: {
        nextRetryAt: 'asc',
      },
      take: limit,
    });
  }

  /**
   * Update retry attempt after failed sync
   */
  async updateRetryAttempt(
    id: bigint,
    success: boolean,
    error?: string,
  ): Promise<RetryEntry> {
    const retryEntry = await this.prismaAny.retryQueue.findUnique({
      where: { id },
    });

    if (!retryEntry) {
      throw new Error(`Retry entry ${id} not found`);
    }

    if (success) {
      // Move to acknowledged (delete from retry)
      await this.prismaAny.retryQueue.delete({
        where: { id },
      });
      return retryEntry;
    }

    // Update retry count and calculate next retry time
    const newRetryCount = retryEntry.retryCount + 1;
    const nextRetryAt = this.calculateNextRetryTime(newRetryCount);

    return this.prismaAny.retryQueue.update({
      where: { id },
      data: {
        retryCount: newRetryCount,
        lastError: error || null,
        nextRetryAt,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mark retry as exhausted (max attempts reached)
   */
  async markRetryExhausted(id: bigint, reason: string): Promise<void> {
    await this.prismaAny.retryQueue.update({
      where: { id },
      data: {
        status: 'failed',
        lastError: `Max retries exhausted: ${reason}`,
      },
    });
  }

  /**
   * Get retry statistics for a user
   */
  async getRetryStats(userId: bigint): Promise<{
    totalRetries: number;
    readyNow: number;
    maxedOut: number;
  }> {
    const totalRetries = await this.prismaAny.retryQueue.count({
      where: {
        userId,
        status: 'pending',
      },
    });

    const readyNow = await this.prismaAny.retryQueue.count({
      where: {
        userId,
        status: 'pending',
        nextRetryAt: {
          lte: new Date(),
        },
      },
    });

    const maxedOut = await this.prismaAny.retryQueue.count({
      where: {
        userId,
        retryCount: {
          gte: 3,
        },
      },
    });

    return { totalRetries, readyNow, maxedOut };
  }

  /**
   * Calculate exponential backoff for next retry
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const now = new Date();
    const delaySeconds =
      this.RETRY_INTERVALS[Math.min(attemptNumber, this.RETRY_INTERVALS.length - 1)];

    return new Date(now.getTime() + delaySeconds * 1000);
  }

  /**
   * Determine if error is retriable
   */
  isRetriableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP status codes
    const status = error.status || error.statusCode;
    if (status) {
      return [408, 429, 500, 502, 503, 504].includes(status);
    }

    return false;
  }

  /**
   * Create sync error with retry information
   */
  createSyncError(message: string, code: string, retriable: boolean): SyncError {
    return {
      code,
      message,
      retriable,
      ...(retriable && { retryAfter: this.RETRY_INTERVALS[0] }),
    };
  }
}

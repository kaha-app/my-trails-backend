import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxEntry } from './sync.models';

@Injectable()
export class OutboxService {
  private prismaAny: any;

  constructor(private prisma: PrismaService) {
    this.prismaAny = this.prisma as any;
  }

  /**
   * Add a new entry to the outbox queue
   * Called when a hike is recorded locally
   */
  async addToOutbox(
    sessionId: string,
    userId: bigint,
    eventType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: any,
  ): Promise<OutboxEntry> {
    return this.prismaAny.outboxQueue.create({
      data: {
        sessionId,
        userId,
        eventType,
        entityType,
        entityId,
        payload,
        status: 'pending',
      },
    });
  }

  /**
   * Get all pending items in outbox queue
   */
  async getPendingItems(userId: bigint, limit: number = 50): Promise<OutboxEntry[]> {
    return this.prismaAny.outboxQueue.findMany({
      where: {
        userId,
        status: 'pending',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  /**
   * Get all items in outbox for a specific session
   */
  async getSessionItems(sessionId: string): Promise<OutboxEntry[]> {
    return this.prismaAny.outboxQueue.findMany({
      where: {
        sessionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Update outbox entry status
   */
  async updateStatus(
    id: bigint,
    status: 'pending' | 'synced' | 'failed',
    error?: string,
  ): Promise<OutboxEntry> {
    return this.prismaAny.outboxQueue.update({
      where: { id },
      data: {
        status,
        error,
        ...(status === 'synced' && { processedAt: new Date() }),
      },
    });
  }

  /**
   * Move item from pending to processing status
   */
  async markProcessing(id: bigint): Promise<OutboxEntry> {
    // Note: We don't have 'processing' status in enum, so we use a workaround
    // by updating with current timestamp reference
    return this.prismaAny.outboxQueue.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count pending items per user
   */
  async countPendingItems(userId: bigint): Promise<number> {
    return this.prismaAny.outboxQueue.count({
      where: {
        userId,
        status: 'pending',
      },
    });
  }

  /**
   * Cleanup synced items (optional - for performance)
   * Can be called periodically to archive old synced items
   */
  async archiveSyncedItems(beforeDate: Date): Promise<number> {
    const result = await this.prismaAny.outboxQueue.deleteMany({
      where: {
        status: 'synced',
        processedAt: {
          lt: beforeDate,
        },
      },
    });
    return result.count;
  }
}

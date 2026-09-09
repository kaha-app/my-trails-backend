import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictResolutionData } from './sync.models';

@Injectable()
export class AcknowledgementService {
  private prismaAny: any;

  constructor(private prisma: PrismaService) {
    this.prismaAny = this.prisma as any;
  }

  /**
   * Create acknowledgement entry after successful sync
   */
  async createAcknowledgement(
    sessionId: string,
    userId: bigint,
    outboxQueueId: bigint,
    acknowledgedData: any,
  ) {
    return this.prismaAny.acknowledgementQueue.create({
      data: {
        sessionId,
        userId,
        outboxQueueId,
        status: 'acknowledged',
        acknowledgedData,
        isConflict: false,
      },
    });
  }

  /**
   * Handle conflict detection and resolution
   */
  async handleConflict(
    sessionId: string,
    userId: bigint,
    outboxQueueId: bigint,
    conflictData: ConflictResolutionData,
  ) {
    return this.prismaAny.acknowledgementQueue.create({
      data: {
        sessionId,
        userId,
        outboxQueueId,
        status: 'pending_resolution',
        isConflict: true,
        conflictType: conflictData.conflictType,
        conflictResolution: conflictData,
      },
    });
  }

  /**
   * Resolve conflict and mark as applied
   */
  async resolveConflict(
    acknowledgementId: bigint,
    resolution: 'last_write_wins' | 'merge' | 'manual',
    resolvedData: any,
  ) {
    return this.prismaAny.acknowledgementQueue.update({
      where: { id: acknowledgementId },
      data: {
        status: 'applied',
        conflictResolution: {
          resolution,
          resolvedData,
        },
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Get pending conflicts for user
   */
  async getPendingConflicts(userId: bigint) {
    return this.prismaAny.acknowledgementQueue.findMany({
      where: {
        userId,
        isConflict: true,
        status: 'pending_resolution',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get acknowledgements for a session
   */
  async getSessionAcknowledgements(sessionId: string) {
    return this.prismaAny.acknowledgementQueue.findMany({
      where: {
        sessionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Mark acknowledgement as applied to local DB
   */
  async markApplied(id: bigint) {
    return this.prismaAny.acknowledgementQueue.update({
      where: { id },
      data: {
        status: 'applied',
      },
    });
  }

  /**
   * Check if acknowledgement can be applied
   */
  async canApplyAcknowledgement(id: bigint): Promise<boolean> {
    const ack = await this.prismaAny.acknowledgementQueue.findUnique({
      where: { id },
    });

    if (!ack) return false;

    // Can apply if acknowledged (no conflict) or conflict is resolved
    return ack.status === 'acknowledged' || (ack.isConflict && ack.status === 'applied');
  }
}

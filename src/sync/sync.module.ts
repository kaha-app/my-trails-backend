import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncEngineService } from './sync-engine.service';
import { OutboxService } from './outbox.service';
import { RetryService } from './retry.service';
import { AcknowledgementService } from './acknowledgement.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    SyncEngineService,
    OutboxService,
    RetryService,
    AcknowledgementService,
    ConflictResolverService,
  ],
  controllers: [SyncController],
  exports: [
    SyncEngineService,
    OutboxService,
    RetryService,
    AcknowledgementService,
    ConflictResolverService,
  ],
})
export class SyncModule {}

import { Worker, Job } from 'bullmq';
import { VECTOR_SYNC_QUEUE_NAME } from '../queue/vector.queue';
import { getRedisConnection } from '../../queue/queue.config';
import { bindWorkerEvents } from '../../queue/queue.events';
import { VectorSyncJobPayload, VectorSyncStatus } from '../models/vector.types';
import { VectorSyncService } from '../services/vectorSync.service';
import { VectorMetricsTracker } from '../utils/metrics';
import { DocumentRepository } from '../../repositories/document.repository';
import { ChunkRepository } from '../../chunking/repositories/chunk.repository';
import { DocumentStatus } from '../../models/Document';
import { ChunkModel } from '../../chunking/models/documentChunk';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

import { runWithGeneratedContext } from '../../logging/correlation';

export class VectorSyncWorker {
  private worker: Worker;
  private syncService: VectorSyncService;
  private documentRepository: DocumentRepository;
  private chunkRepository: ChunkRepository;
  private metricsTracker: VectorMetricsTracker;

  constructor() {
    this.syncService = new VectorSyncService();
    this.documentRepository = new DocumentRepository();
    this.chunkRepository = new ChunkRepository();
    this.metricsTracker = VectorMetricsTracker.getInstance();

    const connection = getRedisConnection();
    this.worker = new Worker(
      VECTOR_SYNC_QUEUE_NAME,
      async (job: Job<VectorSyncJobPayload>) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: config.workerConcurrency || 1,
        prefix: config.queuePrefix,
      }
    );

    bindWorkerEvents(this.worker);
    logger.info(`[Vector Sync Worker] Worker initialized with concurrency: ${config.workerConcurrency}`);
  }

  /**
   * Processes a queued vector sync job.
   */
  private async processJob(job: Job<VectorSyncJobPayload>): Promise<any> {
    const { documentId, chunkIds, processingVersion, requestId, correlationId } = job.data;
    return runWithGeneratedContext(requestId, correlationId, async () => {
      const attempt = job.attemptsMade + 1;
      logger.info(`[Vector Sync Worker] Job ${job.id} starting. Document ID: ${documentId}, Attempt: ${attempt}`);

      let chunks: any[] = [];

      try {
        const doc = await this.documentRepository.findByDocumentId(documentId);
        if (!doc || doc.status === DocumentStatus.CANCELLED) {
          logger.info(`[Vector Sync Worker] Job ${job.id} for document ${documentId} aborted. Document missing or CANCELLED.`);
          return { status: 'CANCELLED' };
        }

      await this.documentRepository.updateStatus(documentId, DocumentStatus.VECTOR_SYNCING);

      chunks = await this.chunkRepository.findByDocument(documentId);
      if (chunkIds && chunkIds.length > 0) {
        chunks = chunks.filter(c => chunkIds.includes(c.chunkId));
      }

      const start = Date.now();
      const syncedCount = await this.syncService.syncDocument(documentId, processingVersion);
      const latency = Date.now() - start;

      await this.documentRepository.updateStatus(documentId, DocumentStatus.INDEXED, {
        progress: 100,
      });

      this.metricsTracker.recordSuccess(syncedCount, latency);
      logger.info(`[Vector Sync Worker] Successfully synced ${syncedCount} vectors for document ${documentId} in ${latency}ms`);

      return { status: 'COMPLETED', syncedCount };
    } catch (error: any) {
      const errMsg = error.message || String(error);
      logger.error(`[Vector Sync Worker] Job ${job.id} failed on attempt ${attempt}. Error: ${errMsg}`);

      const isRecoverable = this.isRecoverableError(error);
      const maxAttempts = job.opts.attempts || config.maxRetries || 3;

      if (chunks.length > 0) {
        const chunkIdsToUpdate = chunks.map(c => c.chunkId);
        if (isRecoverable && attempt < maxAttempts) {
          logger.warn(`[Vector Sync Worker] Job ${job.id} failed with recoverable error. Retrying... (${attempt}/${maxAttempts})`);
          
          await ChunkModel.updateMany(
            { chunkId: { $in: chunkIdsToUpdate } },
            {
              $set: {
                vectorSyncStatus: VectorSyncStatus.RETRYING,
                vectorSyncError: errMsg,
              }
            }
          );
          
          this.metricsTracker.recordRetry();
        } else {
          logger.error(`[Vector Sync Worker] Job ${job.id} failed permanently (Unrecoverable or Max Retries exceeded).`);
          
          await ChunkModel.updateMany(
            { chunkId: { $in: chunkIdsToUpdate } },
            {
              $set: {
                vectorSyncStatus: VectorSyncStatus.FAILED,
                vectorSyncError: errMsg,
              }
            }
          );

          await this.documentRepository.updateStatus(documentId, DocumentStatus.FAILED, {
            errorDetails: `Vector Sync failed: ${errMsg}`,
          });

          this.metricsTracker.recordFailure(chunks.length);
        }
      } else {
        await this.documentRepository.updateStatus(documentId, DocumentStatus.FAILED, {
          errorDetails: `Vector Sync failed: ${errMsg}`,
        });
      }

      throw error;
    }
  });
}

  /**
   * Identifies recoverable failures (timeouts, network errors) vs unrecoverable configurations.
   */
  private isRecoverableError(error: any): boolean {
    const errMsg = String(error.message || error).toLowerCase();
    if (errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('forbidden') || error.status === 401 || error.status === 403) {
      return false;
    }
    return true;
  }

  /**
   * Graceful close of worker.
   */
  public async close(): Promise<void> {
    logger.info('[Vector Sync Worker] Worker shutting down.');
    await this.worker.close();
  }
}

export default VectorSyncWorker;

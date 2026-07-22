import { Worker, Job } from 'bullmq';
import { EMBEDDING_QUEUE_NAME } from '../queue/embedding.queue';
import { getRedisConnection } from '../../queue/queue.config';
import { bindWorkerEvents } from '../../queue/queue.events';
import { EmbeddingJobPayload, ChunkEmbeddingStatus } from '../models/embedding.types';
import { EmbeddingService } from '../services/embedding.service';
import { EmbeddingMetricsTracker } from '../utils/metrics';
import { DocumentRepository } from '../../repositories/document.repository';
import { ChunkRepository } from '../../chunking/repositories/chunk.repository';
import { DocumentStatus } from '../../models/Document';
import { ChunkModel } from '../../chunking/models/documentChunk';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';
import { VectorQueue } from '../../vector/queue/vector.queue';

import { runWithGeneratedContext, getRequestId, getCorrelationId } from '../../logging/correlation';

export class EmbeddingWorker {
  private worker: Worker;
  private embeddingService: EmbeddingService;
  private documentRepository: DocumentRepository;
  private chunkRepository: ChunkRepository;
  private metricsTracker: EmbeddingMetricsTracker;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.documentRepository = new DocumentRepository();
    this.chunkRepository = new ChunkRepository();
    this.metricsTracker = EmbeddingMetricsTracker.getInstance();

    const connection = getRedisConnection();
    this.worker = new Worker(
      EMBEDDING_QUEUE_NAME,
      async (job: Job<EmbeddingJobPayload>) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: config.workerConcurrency || 1,
        prefix: config.queuePrefix,
      }
    );

    bindWorkerEvents(this.worker);
    logger.info(`[Embedding Worker] Worker initialized with concurrency: ${config.workerConcurrency}`);
  }

  /**
   * Processes a queued embedding job.
   */
  private async processJob(job: Job<EmbeddingJobPayload>): Promise<any> {
    const { documentId, chunkIds, processingVersion, requestId, correlationId } = job.data;
    return runWithGeneratedContext(requestId, correlationId, async () => {
      const attempt = job.attemptsMade + 1;
      logger.info(`[Embedding Worker] Job ${job.id} starting. Document ID: ${documentId}, Attempt: ${attempt}`);

      let chunks: any[] = [];

      try {
        // 1. Check if document exists and is not cancelled
        const doc = await this.documentRepository.findByDocumentId(documentId);
        if (!doc || doc.status === DocumentStatus.CANCELLED) {
          logger.info(`[Embedding Worker] Job ${job.id} for document ${documentId} aborted. Document is missing or CANCELLED.`);
          return { status: 'CANCELLED' };
        }

        // 2. Set document status to EMBEDDING_IN_PROGRESS
        await this.documentRepository.updateStatus(documentId, DocumentStatus.EMBEDDING_IN_PROGRESS);

        // 3. Load chunks from MongoDB
        chunks = await this.chunkRepository.findByDocument(documentId);
        if (chunkIds && chunkIds.length > 0) {
          chunks = chunks.filter(c => chunkIds.includes(c.chunkId));
        }

        if (chunks.length === 0) {
          logger.warn(`[Embedding Worker] No chunks found to process for document: ${documentId}`);
          await this.documentRepository.updateStatus(documentId, DocumentStatus.EMBEDDING_COMPLETED, {
            progress: 100,
          });
          return { status: 'COMPLETED', chunksProcessed: 0 };
        }

        logger.info(`[Embedding Worker] Found ${chunks.length} chunks to embed for document: ${documentId}`);

        // 4. Update chunk statuses to PROCESSING
        const chunkIdsToUpdate = chunks.map(c => c.chunkId);
        await ChunkModel.updateMany(
          { chunkId: { $in: chunkIdsToUpdate } },
          { $set: { embeddingStatus: ChunkEmbeddingStatus.PROCESSING } }
        );

        // 5. Generate embeddings
        const texts = chunks.map(c => c.content);
        const start = Date.now();
        const results = await this.embeddingService.generateEmbeddings(texts);
        const latency = Date.now() - start;

        // 6. Update chunk records with float vectors
        const bulkOps = chunks.map((chunk, index) => {
          const res = results[index];
          const embedding = res?.embedding || [];
          const dimensions = res?.dimensions || 1536;
          return {
            updateOne: {
              filter: { chunkId: chunk.chunkId },
              update: {
                $set: {
                  embedding: embedding,
                  embeddingModel: config.embeddingModel,
                  embeddingVersion: processingVersion,
                  embeddingCreatedAt: new Date(),
                  embeddingStatus: ChunkEmbeddingStatus.COMPLETED,
                  embeddingDimensions: dimensions,
                },
              },
            },
          };
        });

        await ChunkModel.bulkWrite(bulkOps);

        // 7. Update document status to VECTOR_SYNC_PENDING and enqueue job
        await this.documentRepository.updateStatus(documentId, DocumentStatus.VECTOR_SYNC_PENDING, {
          progress: 95,
        });

        const vectorQueue = VectorQueue.getInstance();
        await vectorQueue.addJob({
          documentId,
          processingVersion,
          priority: job.data.priority || 'NORMAL',
          requestId: getRequestId(),
          correlationId: getCorrelationId(),
        });

        // 8. Record Metrics
        this.metricsTracker.recordSuccess(chunks.length, latency);
        logger.info(`[Embedding Worker] Successfully embedded ${chunks.length} chunks for document: ${documentId} in ${latency}ms`);

        return { status: 'COMPLETED', chunksProcessed: chunks.length };
      } catch (error: any) {
        const errMsg = error.message || String(error);
        logger.error(`[Embedding Worker] Job ${job.id} for document ${documentId} failed on attempt ${attempt}. Error: ${errMsg}`);

      const isRecoverable = this.isRecoverableError(error);
      const maxAttempts = job.opts.attempts || config.maxRetries || 3;

      if (chunks.length > 0) {
        if (isRecoverable && attempt < maxAttempts) {
          logger.warn(`[Embedding Worker] Job ${job.id} failed with recoverable error. Retrying... (${attempt}/${maxAttempts})`);
          
          await ChunkModel.updateMany(
            { chunkId: { $in: chunks.map(c => c.chunkId) } },
            { $set: { embeddingStatus: ChunkEmbeddingStatus.RETRYING } }
          );

          this.metricsTracker.recordRetry();
        } else {
          logger.error(`[Embedding Worker] Job ${job.id} failed permanently (Unrecoverable or Max Retries exceeded).`);
          
          await ChunkModel.updateMany(
            { chunkId: { $in: chunks.map(c => c.chunkId) } },
            { $set: { embeddingStatus: ChunkEmbeddingStatus.FAILED } }
          );

          await this.documentRepository.updateStatus(documentId, DocumentStatus.FAILED, {
            errorDetails: `Embedding failed: ${errMsg}`,
          });

          this.metricsTracker.recordFailure(chunks.length);
        }
      } else {
        await this.documentRepository.updateStatus(documentId, DocumentStatus.FAILED, {
          errorDetails: `Embedding failed: ${errMsg}`,
        });
      }

      throw error;
    }
  });
}

  /**
   * Helper to inspect error codes and determine if it's safe to retry.
   */
  private isRecoverableError(error: any): boolean {
    if (error.status) {
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        return false;
      }
      return true;
    }
    
    const errMsg = String(error.message || error).toLowerCase();
    if (errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('invalid_api_key')) {
      return false;
    }

    return true;
  }

  /**
   * Graceful close of worker.
   */
  public async close(): Promise<void> {
    logger.info('[Embedding Worker] Worker shutting down.');
    await this.worker.close();
  }
}

export default EmbeddingWorker;

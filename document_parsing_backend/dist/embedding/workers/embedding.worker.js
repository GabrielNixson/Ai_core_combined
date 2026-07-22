"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingWorker = void 0;
const bullmq_1 = require("bullmq");
const embedding_queue_1 = require("../queue/embedding.queue");
const queue_config_1 = require("../../queue/queue.config");
const queue_events_1 = require("../../queue/queue.events");
const embedding_types_1 = require("../models/embedding.types");
const embedding_service_1 = require("../services/embedding.service");
const metrics_1 = require("../utils/metrics");
const document_repository_1 = require("../../repositories/document.repository");
const chunk_repository_1 = require("../../chunking/repositories/chunk.repository");
const Document_1 = require("../../models/Document");
const documentChunk_1 = require("../../chunking/models/documentChunk");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config/config");
const vector_queue_1 = require("../../vector/queue/vector.queue");
const correlation_1 = require("../../logging/correlation");
class EmbeddingWorker {
    worker;
    embeddingService;
    documentRepository;
    chunkRepository;
    metricsTracker;
    constructor() {
        this.embeddingService = new embedding_service_1.EmbeddingService();
        this.documentRepository = new document_repository_1.DocumentRepository();
        this.chunkRepository = new chunk_repository_1.ChunkRepository();
        this.metricsTracker = metrics_1.EmbeddingMetricsTracker.getInstance();
        const connection = (0, queue_config_1.getRedisConnection)();
        this.worker = new bullmq_1.Worker(embedding_queue_1.EMBEDDING_QUEUE_NAME, async (job) => {
            return this.processJob(job);
        }, {
            connection,
            concurrency: config_1.config.workerConcurrency || 1,
            prefix: config_1.config.queuePrefix,
        });
        (0, queue_events_1.bindWorkerEvents)(this.worker);
        logger_1.logger.info(`[Embedding Worker] Worker initialized with concurrency: ${config_1.config.workerConcurrency}`);
    }
    /**
     * Processes a queued embedding job.
     */
    async processJob(job) {
        const { documentId, chunkIds, processingVersion, requestId, correlationId } = job.data;
        return (0, correlation_1.runWithGeneratedContext)(requestId, correlationId, async () => {
            const attempt = job.attemptsMade + 1;
            logger_1.logger.info(`[Embedding Worker] Job ${job.id} starting. Document ID: ${documentId}, Attempt: ${attempt}`);
            let chunks = [];
            try {
                // 1. Check if document exists and is not cancelled
                const doc = await this.documentRepository.findByDocumentId(documentId);
                if (!doc || doc.status === Document_1.DocumentStatus.CANCELLED) {
                    logger_1.logger.info(`[Embedding Worker] Job ${job.id} for document ${documentId} aborted. Document is missing or CANCELLED.`);
                    return { status: 'CANCELLED' };
                }
                // 2. Set document status to EMBEDDING_IN_PROGRESS
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.EMBEDDING_IN_PROGRESS);
                // 3. Load chunks from MongoDB
                chunks = await this.chunkRepository.findByDocument(documentId);
                if (chunkIds && chunkIds.length > 0) {
                    chunks = chunks.filter(c => chunkIds.includes(c.chunkId));
                }
                if (chunks.length === 0) {
                    logger_1.logger.warn(`[Embedding Worker] No chunks found to process for document: ${documentId}`);
                    await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.EMBEDDING_COMPLETED, {
                        progress: 100,
                    });
                    return { status: 'COMPLETED', chunksProcessed: 0 };
                }
                logger_1.logger.info(`[Embedding Worker] Found ${chunks.length} chunks to embed for document: ${documentId}`);
                // 4. Update chunk statuses to PROCESSING
                const chunkIdsToUpdate = chunks.map(c => c.chunkId);
                await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunkIdsToUpdate } }, { $set: { embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.PROCESSING } });
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
                                    embeddingModel: config_1.config.embeddingModel,
                                    embeddingVersion: processingVersion,
                                    embeddingCreatedAt: new Date(),
                                    embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.COMPLETED,
                                    embeddingDimensions: dimensions,
                                },
                            },
                        },
                    };
                });
                await documentChunk_1.ChunkModel.bulkWrite(bulkOps);
                // 7. Update document status to VECTOR_SYNC_PENDING and enqueue job
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.VECTOR_SYNC_PENDING, {
                    progress: 95,
                });
                const vectorQueue = vector_queue_1.VectorQueue.getInstance();
                await vectorQueue.addJob({
                    documentId,
                    processingVersion,
                    priority: job.data.priority || 'NORMAL',
                    requestId: (0, correlation_1.getRequestId)(),
                    correlationId: (0, correlation_1.getCorrelationId)(),
                });
                // 8. Record Metrics
                this.metricsTracker.recordSuccess(chunks.length, latency);
                logger_1.logger.info(`[Embedding Worker] Successfully embedded ${chunks.length} chunks for document: ${documentId} in ${latency}ms`);
                return { status: 'COMPLETED', chunksProcessed: chunks.length };
            }
            catch (error) {
                const errMsg = error.message || String(error);
                logger_1.logger.error(`[Embedding Worker] Job ${job.id} for document ${documentId} failed on attempt ${attempt}. Error: ${errMsg}`);
                const isRecoverable = this.isRecoverableError(error);
                const maxAttempts = job.opts.attempts || config_1.config.maxRetries || 3;
                if (chunks.length > 0) {
                    if (isRecoverable && attempt < maxAttempts) {
                        logger_1.logger.warn(`[Embedding Worker] Job ${job.id} failed with recoverable error. Retrying... (${attempt}/${maxAttempts})`);
                        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunks.map(c => c.chunkId) } }, { $set: { embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.RETRYING } });
                        this.metricsTracker.recordRetry();
                    }
                    else {
                        logger_1.logger.error(`[Embedding Worker] Job ${job.id} failed permanently (Unrecoverable or Max Retries exceeded).`);
                        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunks.map(c => c.chunkId) } }, { $set: { embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.FAILED } });
                        await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
                            errorDetails: `Embedding failed: ${errMsg}`,
                        });
                        this.metricsTracker.recordFailure(chunks.length);
                    }
                }
                else {
                    await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
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
    isRecoverableError(error) {
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
    async close() {
        logger_1.logger.info('[Embedding Worker] Worker shutting down.');
        await this.worker.close();
    }
}
exports.EmbeddingWorker = EmbeddingWorker;
exports.default = EmbeddingWorker;

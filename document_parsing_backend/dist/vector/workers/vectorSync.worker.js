"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSyncWorker = void 0;
const bullmq_1 = require("bullmq");
const vector_queue_1 = require("../queue/vector.queue");
const queue_config_1 = require("../../queue/queue.config");
const queue_events_1 = require("../../queue/queue.events");
const vector_types_1 = require("../models/vector.types");
const vectorSync_service_1 = require("../services/vectorSync.service");
const metrics_1 = require("../utils/metrics");
const document_repository_1 = require("../../repositories/document.repository");
const chunk_repository_1 = require("../../chunking/repositories/chunk.repository");
const Document_1 = require("../../models/Document");
const documentChunk_1 = require("../../chunking/models/documentChunk");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config/config");
const correlation_1 = require("../../logging/correlation");
class VectorSyncWorker {
    worker;
    syncService;
    documentRepository;
    chunkRepository;
    metricsTracker;
    constructor() {
        this.syncService = new vectorSync_service_1.VectorSyncService();
        this.documentRepository = new document_repository_1.DocumentRepository();
        this.chunkRepository = new chunk_repository_1.ChunkRepository();
        this.metricsTracker = metrics_1.VectorMetricsTracker.getInstance();
        const connection = (0, queue_config_1.getRedisConnection)();
        this.worker = new bullmq_1.Worker(vector_queue_1.VECTOR_SYNC_QUEUE_NAME, async (job) => {
            return this.processJob(job);
        }, {
            connection,
            concurrency: config_1.config.workerConcurrency || 1,
            prefix: config_1.config.queuePrefix,
        });
        (0, queue_events_1.bindWorkerEvents)(this.worker);
        logger_1.logger.info(`[Vector Sync Worker] Worker initialized with concurrency: ${config_1.config.workerConcurrency}`);
    }
    /**
     * Processes a queued vector sync job.
     */
    async processJob(job) {
        const { documentId, chunkIds, processingVersion, requestId, correlationId } = job.data;
        return (0, correlation_1.runWithGeneratedContext)(requestId, correlationId, async () => {
            const attempt = job.attemptsMade + 1;
            logger_1.logger.info(`[Vector Sync Worker] Job ${job.id} starting. Document ID: ${documentId}, Attempt: ${attempt}`);
            let chunks = [];
            try {
                const doc = await this.documentRepository.findByDocumentId(documentId);
                if (!doc || doc.status === Document_1.DocumentStatus.CANCELLED) {
                    logger_1.logger.info(`[Vector Sync Worker] Job ${job.id} for document ${documentId} aborted. Document missing or CANCELLED.`);
                    return { status: 'CANCELLED' };
                }
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.VECTOR_SYNCING);
                chunks = await this.chunkRepository.findByDocument(documentId);
                if (chunkIds && chunkIds.length > 0) {
                    chunks = chunks.filter(c => chunkIds.includes(c.chunkId));
                }
                const start = Date.now();
                const syncedCount = await this.syncService.syncDocument(documentId, processingVersion);
                const latency = Date.now() - start;
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.INDEXED, {
                    progress: 100,
                });
                this.metricsTracker.recordSuccess(syncedCount, latency);
                logger_1.logger.info(`[Vector Sync Worker] Successfully synced ${syncedCount} vectors for document ${documentId} in ${latency}ms`);
                return { status: 'COMPLETED', syncedCount };
            }
            catch (error) {
                const errMsg = error.message || String(error);
                logger_1.logger.error(`[Vector Sync Worker] Job ${job.id} failed on attempt ${attempt}. Error: ${errMsg}`);
                const isRecoverable = this.isRecoverableError(error);
                const maxAttempts = job.opts.attempts || config_1.config.maxRetries || 3;
                if (chunks.length > 0) {
                    const chunkIdsToUpdate = chunks.map(c => c.chunkId);
                    if (isRecoverable && attempt < maxAttempts) {
                        logger_1.logger.warn(`[Vector Sync Worker] Job ${job.id} failed with recoverable error. Retrying... (${attempt}/${maxAttempts})`);
                        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunkIdsToUpdate } }, {
                            $set: {
                                vectorSyncStatus: vector_types_1.VectorSyncStatus.RETRYING,
                                vectorSyncError: errMsg,
                            }
                        });
                        this.metricsTracker.recordRetry();
                    }
                    else {
                        logger_1.logger.error(`[Vector Sync Worker] Job ${job.id} failed permanently (Unrecoverable or Max Retries exceeded).`);
                        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunkIdsToUpdate } }, {
                            $set: {
                                vectorSyncStatus: vector_types_1.VectorSyncStatus.FAILED,
                                vectorSyncError: errMsg,
                            }
                        });
                        await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
                            errorDetails: `Vector Sync failed: ${errMsg}`,
                        });
                        this.metricsTracker.recordFailure(chunks.length);
                    }
                }
                else {
                    await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
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
    isRecoverableError(error) {
        const errMsg = String(error.message || error).toLowerCase();
        if (errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('forbidden') || error.status === 401 || error.status === 403) {
            return false;
        }
        return true;
    }
    /**
     * Graceful close of worker.
     */
    async close() {
        logger_1.logger.info('[Vector Sync Worker] Worker shutting down.');
        await this.worker.close();
    }
}
exports.VectorSyncWorker = VectorSyncWorker;
exports.default = VectorSyncWorker;

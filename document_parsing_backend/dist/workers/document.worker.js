"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentWorker = void 0;
const bullmq_1 = require("bullmq");
const queue_constants_1 = require("../queue/queue.constants");
const queue_config_1 = require("../queue/queue.config");
const queue_events_1 = require("../queue/queue.events");
const documentProcessor_service_1 = require("../services/documentProcessor.service");
const document_repository_1 = require("../repositories/document.repository");
const Document_1 = require("../models/Document");
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
const embedding_queue_1 = require("../embedding/queue/embedding.queue");
const correlation_1 = require("../logging/correlation");
class DocumentWorker {
    worker;
    processorService;
    documentRepository;
    constructor() {
        this.processorService = new documentProcessor_service_1.DocumentProcessorService();
        this.documentRepository = new document_repository_1.DocumentRepository();
        const connection = (0, queue_config_1.getRedisConnection)();
        this.worker = new bullmq_1.Worker(queue_constants_1.QUEUE_NAME, async (job) => {
            return this.processJob(job);
        }, {
            connection,
            concurrency: config_1.config.workerConcurrency || 1,
            prefix: config_1.config.queuePrefix,
        });
        (0, queue_events_1.bindWorkerEvents)(this.worker);
        logger_1.logger.info(`[Document Worker] Worker initialized with concurrency: ${config_1.config.workerConcurrency}`);
    }
    /**
     * Process a single popped queue job.
     */
    async processJob(job) {
        const { documentId, requestedBy, requestId, correlationId } = job.data;
        return (0, correlation_1.runWithGeneratedContext)(requestId, correlationId, async () => {
            logger_1.logger.info(`[Document Worker] Job ${job.id} starting. Document ID: ${documentId}, Requested By: ${requestedBy}`);
            try {
                // 1. Initial verification check for cancellation before starting
                const doc = await this.documentRepository.findByDocumentId(documentId);
                if (!doc || doc.status === Document_1.DocumentStatus.CANCELLED) {
                    logger_1.logger.info(`[Document Worker] Job ${job.id} for document ${documentId} was marked as CANCELLED. Aborting.`);
                    return { status: 'CANCELLED' };
                }
                // 2. Set progress to 10% and status to PROCESSING
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.PROCESSING, {
                    progress: 10,
                });
                // 3. Execute processing pipeline
                await this.processorService.processDocument(documentId);
                // Fetch fresh document details to get latest version
                const freshDoc = await this.documentRepository.findByDocumentId(documentId);
                const version = freshDoc?.processingVersion || doc.processingVersion || 1;
                // 4. Update status to EMBEDDING_PENDING
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.EMBEDDING_PENDING, {
                    progress: 90,
                });
                // 5. Automatically enqueue embedding job
                const embeddingQueue = embedding_queue_1.EmbeddingQueue.getInstance();
                await embeddingQueue.addJob({
                    documentId,
                    processingVersion: version,
                    priority: job.data.priority || 'NORMAL',
                    requestId: (0, correlation_1.getRequestId)(),
                    correlationId: (0, correlation_1.getCorrelationId)(),
                });
                logger_1.logger.info(`[Document Worker] Job ${job.id} for document ${documentId} completed chunking. Enqueued embedding job.`);
                return { status: 'EMBEDDING_PENDING' };
            }
            catch (error) {
                const errMsg = error.message || String(error);
                logger_1.logger.error(`[Document Worker] Job ${job.id} for document ${documentId} failed. Error: ${errMsg}`);
                if (errMsg.includes('cancelled') || errMsg.includes('CANCELLED')) {
                    await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.CANCELLED, {
                        errorDetails: 'Processing cancelled by user request.',
                        progress: 0,
                    });
                    return { status: 'CANCELLED' };
                }
                // Record failures inside the database
                await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
                    errorDetails: errMsg,
                });
                throw error; // Re-throw so BullMQ registers retry attempts or failure states
            }
        });
    }
    /**
     * Graceful close of connection.
     */
    async close() {
        logger_1.logger.info('[Document Worker] Worker shutting down.');
        await this.worker.close();
    }
}
exports.DocumentWorker = DocumentWorker;
exports.default = DocumentWorker;

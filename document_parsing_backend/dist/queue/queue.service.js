"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const queue_constants_1 = require("./queue.constants");
const queue_config_1 = require("./queue.config");
const queue_events_1 = require("./queue.events");
const logger_1 = require("../utils/logger");
const document_repository_1 = require("../repositories/document.repository");
const Document_1 = require("../models/Document");
const correlation_1 = require("../logging/correlation");
class QueueService {
    static instance;
    queue;
    documentRepository;
    constructor() {
        const queueOptions = (0, queue_config_1.getQueueConfig)();
        this.queue = new bullmq_1.Queue(queue_constants_1.QUEUE_NAME, queueOptions);
        this.documentRepository = new document_repository_1.DocumentRepository();
        (0, queue_events_1.bindQueueEvents)(this.queue);
        logger_1.logger.info(`[Queue Service] Initialized queue: ${queue_constants_1.QUEUE_NAME}`);
    }
    static getInstance() {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }
    /**
     * Adds a document processing job to the queue.
     */
    async addJob(jobType, payload, priorityName = 'NORMAL', delay) {
        const priority = queue_constants_1.JOB_PRIORITIES[priorityName];
        // Use documentId as the jobId to easily target/cancel it
        const jobId = payload.documentId;
        // Propagate request context
        payload.requestId = payload.requestId || (0, correlation_1.getRequestId)();
        payload.correlationId = payload.correlationId || (0, correlation_1.getCorrelationId)();
        logger_1.logger.info(`[Queue Service] Queuing job of type '${jobType}' for document: ${payload.documentId} with priority: ${priorityName}`);
        // Update document status to QUEUED in the DB
        await this.documentRepository.updateStatus(payload.documentId, Document_1.DocumentStatus.QUEUED, {
            progress: 0,
        });
        const job = await this.queue.add(jobType, payload, {
            jobId,
            priority,
            delay,
        });
        return job;
    }
    /**
     * Removes a job from the queue if waiting/delayed.
     */
    async removeJob(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job)
            return false;
        const state = await job.getState();
        if (state === 'active') {
            logger_1.logger.warn(`[Queue Service] Cannot remove job ${jobId} directly as it is currently active.`);
            return false;
        }
        await job.remove();
        logger_1.logger.info(`[Queue Service] Successfully removed job ${jobId} from queue.`);
        return true;
    }
    /**
     * Cancels processing for a document.
     * If waiting/delayed: removes from queue.
     * If active: marks status to CANCELLED in DB to signal the worker.
     */
    async cancelJob(documentId) {
        logger_1.logger.info(`[Queue Service] Request to cancel job for document ID: ${documentId}`);
        // 1. Mark status as CANCELLED in MongoDB so active workers will abort
        await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.CANCELLED);
        // 2. Try to remove the job from the queue if it's waiting/delayed
        const removed = await this.removeJob(documentId);
        return removed || true;
    }
    /**
     * Pauses the queue.
     */
    async pauseQueue() {
        logger_1.logger.info('[Queue Service] Pausing queue.');
        await this.queue.pause();
    }
    /**
     * Resumes the queue.
     */
    async resumeQueue() {
        logger_1.logger.info('[Queue Service] Resuming queue.');
        await this.queue.resume();
    }
    /**
     * Collects queue metric stats.
     */
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed, isPaused, workers] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
            this.queue.getDelayedCount(),
            this.queue.isPaused(),
            this.queue.getWorkers(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            paused: isPaused,
            workerCount: workers.length,
        };
    }
    /**
     * Cleans up the queue.
     */
    async cleanQueue(grace = 0) {
        await this.queue.clean(grace, 1000, 'completed');
        await this.queue.clean(grace, 1000, 'failed');
    }
    /**
     * Graceful shutdown.
     */
    async shutdown() {
        logger_1.logger.info('[Queue Service] Closing queue connection.');
        await this.queue.close();
    }
}
exports.QueueService = QueueService;
exports.default = QueueService;

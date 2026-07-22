"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorQueue = exports.VECTOR_SYNC_JOB_TYPE = exports.VECTOR_SYNC_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const queue_config_1 = require("../../queue/queue.config");
const queue_events_1 = require("../../queue/queue.events");
const logger_1 = require("../../utils/logger");
const queue_constants_1 = require("../../queue/queue.constants");
exports.VECTOR_SYNC_QUEUE_NAME = 'vector-sync-processing';
exports.VECTOR_SYNC_JOB_TYPE = 'VECTOR_SYNC_JOB';
const correlation_1 = require("../../logging/correlation");
class VectorQueue {
    static instance;
    queue;
    constructor() {
        const queueOptions = (0, queue_config_1.getQueueConfig)();
        this.queue = new bullmq_1.Queue(exports.VECTOR_SYNC_QUEUE_NAME, queueOptions);
        (0, queue_events_1.bindQueueEvents)(this.queue);
        logger_1.logger.info(`[Vector Queue] Initialized queue: ${exports.VECTOR_SYNC_QUEUE_NAME}`);
    }
    static getInstance() {
        if (!VectorQueue.instance) {
            VectorQueue.instance = new VectorQueue();
        }
        return VectorQueue.instance;
    }
    /**
     * Adds a vector sync job to the queue.
     */
    async addJob(payload, delay) {
        const priority = queue_constants_1.JOB_PRIORITIES[payload.priority] || 20;
        const jobId = payload.documentId;
        // Propagate request context
        payload.requestId = payload.requestId || (0, correlation_1.getRequestId)();
        payload.correlationId = payload.correlationId || (0, correlation_1.getCorrelationId)();
        logger_1.logger.info(`[Vector Queue] Queuing vector sync job for document: ${payload.documentId} with priority: ${payload.priority}`);
        const job = await this.queue.add(exports.VECTOR_SYNC_JOB_TYPE, payload, {
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
            logger_1.logger.warn(`[Vector Queue] Cannot remove job ${jobId} directly as it is currently active.`);
            return false;
        }
        await job.remove();
        logger_1.logger.info(`[Vector Queue] Successfully removed job ${jobId} from queue.`);
        return true;
    }
    /**
     * Cancels vector sync job for a document.
     */
    async cancelJob(documentId) {
        logger_1.logger.info(`[Vector Queue] Request to cancel vector sync job for document ID: ${documentId}`);
        return this.removeJob(documentId);
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
     * Graceful shutdown.
     */
    async shutdown() {
        logger_1.logger.info('[Vector Queue] Closing queue connection.');
        await this.queue.close();
    }
}
exports.VectorQueue = VectorQueue;
exports.default = VectorQueue;

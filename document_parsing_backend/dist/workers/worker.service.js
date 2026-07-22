"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const document_worker_1 = require("./document.worker");
const embedding_worker_1 = require("../embedding/workers/embedding.worker");
const vectorSync_worker_1 = require("../vector/workers/vectorSync.worker");
const logger_1 = require("../utils/logger");
class WorkerService {
    static instance;
    documentWorkers = [];
    embeddingWorkers = [];
    vectorSyncWorkers = [];
    isStarted = false;
    constructor() { }
    static getInstance() {
        if (!WorkerService.instance) {
            WorkerService.instance = new WorkerService();
        }
        return WorkerService.instance;
    }
    /**
     * Starts worker instances. Concurrency is configured internally inside the workers.
     */
    async startWorkers(instancesCount = 1) {
        if (this.isStarted) {
            logger_1.logger.warn('[Worker Service] Workers have already been started. Skipping.');
            return;
        }
        logger_1.logger.info(`[Worker Service] Starting ${instancesCount} document, embedding, and vector sync workers...`);
        for (let i = 0; i < instancesCount; i++) {
            const docWorker = new document_worker_1.DocumentWorker();
            this.documentWorkers.push(docWorker);
            const embedWorker = new embedding_worker_1.EmbeddingWorker();
            this.embeddingWorkers.push(embedWorker);
            const vectorWorker = new vectorSync_worker_1.VectorSyncWorker();
            this.vectorSyncWorkers.push(vectorWorker);
        }
        this.isStarted = true;
        logger_1.logger.info(`[Worker Service] Successfully registered and started ${this.documentWorkers.length} doc workers, ${this.embeddingWorkers.length} embedding workers, and ${this.vectorSyncWorkers.length} vector sync workers.`);
    }
    /**
     * Stop workers.
     */
    async stopWorkers() {
        if (!this.isStarted) {
            logger_1.logger.warn('[Worker Service] No active workers to stop.');
            return;
        }
        logger_1.logger.info('[Worker Service] Stopping worker connections...');
        await Promise.all([
            ...this.documentWorkers.map(w => w.close()),
            ...this.embeddingWorkers.map(w => w.close()),
            ...this.vectorSyncWorkers.map(w => w.close()),
        ]);
        this.documentWorkers = [];
        this.embeddingWorkers = [];
        this.vectorSyncWorkers = [];
        this.isStarted = false;
        logger_1.logger.info('[Worker Service] All background workers stopped.');
    }
    /**
     * Worker tier health status.
     */
    getHealth() {
        return {
            started: this.isStarted,
            activeWorkers: this.documentWorkers.length + this.embeddingWorkers.length + this.vectorSyncWorkers.length,
        };
    }
}
exports.WorkerService = WorkerService;
exports.default = WorkerService;

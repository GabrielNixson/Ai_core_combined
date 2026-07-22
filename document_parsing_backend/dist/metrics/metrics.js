"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRouter = exports.metricsTracker = void 0;
const express_1 = require("express");
const os_1 = __importDefault(require("os"));
const queue_service_1 = require("../queue/queue.service");
const embedding_queue_1 = require("../embedding/queue/embedding.queue");
const vector_queue_1 = require("../vector/queue/vector.queue");
class MetricsTracker {
    static instance;
    totalRequests = 0;
    errorCount = 0;
    statusCodes = {};
    requestLatencies = [];
    totalDocumentsProcessed = 0;
    totalChunksGenerated = 0;
    totalEmbeddingsGenerated = 0;
    totalVectorSyncs = 0;
    llmLatencies = [];
    ragLatencies = [];
    retrievalLatencies = [];
    langgraphLatencies = [];
    constructor() { }
    static getInstance() {
        if (!MetricsTracker.instance) {
            MetricsTracker.instance = new MetricsTracker();
        }
        return MetricsTracker.instance;
    }
    recordRequest(_method, _path, latency, statusCode) {
        this.totalRequests++;
        this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
        this.requestLatencies.push(latency);
        if (this.requestLatencies.length > 1000)
            this.requestLatencies.shift(); // sliding window of 1000
        if (statusCode >= 400) {
            this.errorCount++;
        }
    }
    recordDocumentProcessed() {
        this.totalDocumentsProcessed++;
    }
    recordChunksGenerated(count) {
        this.totalChunksGenerated += count;
    }
    recordEmbeddingsGenerated(count) {
        this.totalEmbeddingsGenerated += count;
    }
    recordVectorSync(count) {
        this.totalVectorSyncs += count;
    }
    recordLLMLatency(latency) {
        this.llmLatencies.push(latency);
        if (this.llmLatencies.length > 100)
            this.llmLatencies.shift();
    }
    recordRAGLatency(latency) {
        this.ragLatencies.push(latency);
        if (this.ragLatencies.length > 100)
            this.ragLatencies.shift();
    }
    recordRetrievalLatency(latency) {
        this.retrievalLatencies.push(latency);
        if (this.retrievalLatencies.length > 100)
            this.retrievalLatencies.shift();
    }
    recordLangGraphLatency(latency) {
        this.langgraphLatencies.push(latency);
        if (this.langgraphLatencies.length > 100)
            this.langgraphLatencies.shift();
    }
    getAverage(arr) {
        if (arr.length === 0)
            return 0;
        const sum = arr.reduce((a, b) => a + b, 0);
        return parseFloat((sum / arr.length).toFixed(2));
    }
    async getMetricsSummary() {
        const memory = process.memoryUsage();
        const cpu = process.cpuUsage();
        // Get Queue stats
        let docQueueStats = null;
        let embedQueueStats = null;
        let vecQueueStats = null;
        try {
            docQueueStats = await queue_service_1.QueueService.getInstance().getQueueStats();
            embedQueueStats = await embedding_queue_1.EmbeddingQueue.getInstance().getQueueStats();
            vecQueueStats = await vector_queue_1.VectorQueue.getInstance().getQueueStats();
        }
        catch (e) { }
        return {
            system: {
                memory: {
                    rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
                },
                cpu: {
                    user: cpu.user,
                    system: cpu.system,
                },
                uptime: `${process.uptime().toFixed(0)}s`,
                loadAverage: os_1.default.loadavg(),
            },
            http: {
                totalRequests: this.totalRequests,
                errorCount: this.errorCount,
                averageLatencyMs: this.getAverage(this.requestLatencies),
                statusCodes: this.statusCodes,
            },
            pipelines: {
                documentsProcessed: this.totalDocumentsProcessed,
                chunksGenerated: this.totalChunksGenerated,
                embeddingsGenerated: this.totalEmbeddingsGenerated,
                vectorsSynced: this.totalVectorSyncs,
                averageRetrievalLatencyMs: this.getAverage(this.retrievalLatencies),
                averageRAGLatencyMs: this.getAverage(this.ragLatencies),
                averageLLMLatencyMs: this.getAverage(this.llmLatencies),
                averageLangGraphExecutionLatencyMs: this.getAverage(this.langgraphLatencies),
            },
            queues: {
                documentProcessing: docQueueStats,
                embeddingProcessing: embedQueueStats,
                vectorSync: vecQueueStats,
            },
        };
    }
}
exports.metricsTracker = MetricsTracker.getInstance();
exports.metricsRouter = (0, express_1.Router)();
/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Retrieve real-time performance and system metrics
 *     tags: [Monitoring & Health]
 *     responses:
 *       200:
 *         description: Performance and system summary metrics
 */
exports.metricsRouter.get('/', async (_req, res) => {
    const summary = await exports.metricsTracker.getMetricsSummary();
    res.status(200).json(summary);
});

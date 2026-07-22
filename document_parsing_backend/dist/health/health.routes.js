"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const ioredis_1 = __importDefault(require("ioredis"));
const js_client_rest_1 = require("@qdrant/js-client-rest");
const config_1 = require("../config/config");
const worker_service_1 = require("../workers/worker.service");
const queue_service_1 = require("../queue/queue.service");
const embedding_queue_1 = require("../embedding/queue/embedding.queue");
const vector_queue_1 = require("../vector/queue/vector.queue");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Quick server responsiveness liveness probe
 *     tags: [Monitoring & Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   example: "2026-07-17T05:00:00.000Z"
 */
router.get('/live', (_req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
    });
});
/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Comprehensive system dependencies readiness probe
 *     tags: [Monitoring & Health]
 *     responses:
 *       200:
 *         description: All dependent services are healthy and connected
 *       503:
 *         description: One or more dependencies are down
 */
router.get('/ready', async (_req, res) => {
    const checks = {
        mongodb: 'DOWN',
        redis: 'DOWN',
        qdrant: 'DOWN',
        workers: 'DOWN',
    };
    let isHealthy = true;
    // 1. Check MongoDB ready state
    try {
        const readyState = mongoose_1.default.connection.readyState;
        if (readyState === 1) {
            checks.mongodb = 'UP';
        }
        else {
            isHealthy = false;
            checks.mongodb = `DOWN (ReadyState: ${readyState})`;
        }
    }
    catch (err) {
        isHealthy = false;
        checks.mongodb = `ERROR: ${err.message || err}`;
    }
    // 2. Check Redis ping
    let redisCheckClient = null;
    try {
        redisCheckClient = new ioredis_1.default({
            host: config_1.queueConfig.redisHost,
            port: config_1.queueConfig.redisPort,
            password: config_1.queueConfig.redisPassword,
            maxRetriesPerRequest: 0,
            connectTimeout: 2000,
        });
        const pong = await redisCheckClient.ping();
        if (pong === 'PONG') {
            checks.redis = 'UP';
        }
        else {
            isHealthy = false;
            checks.redis = `DOWN (Response: ${pong})`;
        }
    }
    catch (err) {
        isHealthy = false;
        checks.redis = `ERROR: ${err.message || err}`;
    }
    finally {
        if (redisCheckClient) {
            try {
                await redisCheckClient.quit();
            }
            catch (e) { }
        }
    }
    // 3. Check Qdrant collections API
    try {
        const isMock = config_1.config.qdrantHost?.includes('mock') || (config_1.config.qdrantHost === 'http://localhost:6333' && config_1.config.env === 'test');
        if (isMock) {
            checks.qdrant = 'UP (MOCK)';
        }
        else {
            const qdrantClient = new js_client_rest_1.QdrantClient({
                url: config_1.config.qdrantHost,
                apiKey: config_1.config.qdrantApiKey,
            });
            await qdrantClient.getCollections();
            checks.qdrant = 'UP';
        }
    }
    catch (err) {
        isHealthy = false;
        checks.qdrant = `ERROR: ${err.message || err}`;
    }
    // 4. Check Workers started
    try {
        const workerHealth = worker_service_1.WorkerService.getInstance().getHealth();
        checks.workers = workerHealth.started ? `UP (${workerHealth.activeWorkers} active)` : 'DOWN';
        if (!workerHealth.started) {
            isHealthy = false;
        }
    }
    catch (err) {
        isHealthy = false;
        checks.workers = `ERROR: ${err.message || err}`;
    }
    // 5. Gather queues stats
    try {
        const [docQueue, embedQueue, vecQueue] = await Promise.all([
            queue_service_1.QueueService.getInstance().getQueueStats().catch(() => null),
            embedding_queue_1.EmbeddingQueue.getInstance().getQueueStats().catch(() => null),
            vector_queue_1.VectorQueue.getInstance().getQueueStats().catch(() => null),
        ]);
        checks.queues = {
            documentProcessing: docQueue,
            embeddingProcessing: embedQueue,
            vectorSync: vecQueue,
        };
    }
    catch (e) { }
    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json({
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        details: checks,
    });
});
// GET /health - Compatibility route (triggers /ready validation)
router.get('/', (req, res, next) => {
    const readyHandler = router.stack.find(s => s.route?.path === '/ready')?.route?.stack[0]?.handle;
    if (readyHandler) {
        readyHandler(req, res, next);
    }
    else {
        res.status(200).json({ status: 'UP' });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/canvasMock");
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config/config");
const db_1 = require("./config/db");
const logger_1 = require("./utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
const worker_service_1 = require("./workers/worker.service");
const queue_service_1 = require("./queue/queue.service");
const embedding_queue_1 = require("./embedding/queue/embedding.queue");
const vector_queue_1 = require("./vector/queue/vector.queue");
const vector_repository_1 = require("./vector/repositories/vector.repository");
async function startServer() {
    // Connect to MongoDB
    await (0, db_1.connectDatabase)();
    // Ensure Vector Database Collection exists
    try {
        const vectorRepo = new vector_repository_1.VectorRepository();
        await vectorRepo.ensureCollection(config_1.config.vectorDimensions || 1536);
    }
    catch (err) {
        logger_1.logger.error('Failed to initialize Qdrant collection:', err);
    }
    // Start background workers (monolith scale in local development)
    const workerService = worker_service_1.WorkerService.getInstance();
    await workerService.startWorkers(1);
    const server = app_1.default.listen(config_1.config.port, () => {
        logger_1.logger.info(`Server is running in [${config_1.config.env}] mode on port ${config_1.config.port}`);
    });
    const shutdown = async (signal) => {
        logger_1.logger.warn(`Received ${signal}. Shutting down gracefully...`);
        // Stop background workers first to prevent processing interruptions
        try {
            await workerService.stopWorkers();
            await queue_service_1.QueueService.getInstance().shutdown();
            await embedding_queue_1.EmbeddingQueue.getInstance().shutdown();
            await vector_queue_1.VectorQueue.getInstance().shutdown();
            logger_1.logger.info('Queue and workers shut down successfully.');
        }
        catch (err) {
            logger_1.logger.error('Error during worker cleanup:', err);
        }
        server.close(async () => {
            logger_1.logger.info('HTTP server closed.');
            try {
                await mongoose_1.default.connection.close();
                logger_1.logger.info('MongoDB connection closed.');
                process.exit(0);
            }
            catch (err) {
                logger_1.logger.error('Error during database disconnection:', err);
                process.exit(1);
            }
        });
        // Force close server after 10s if graceful shutdown fails
        setTimeout(() => {
            logger_1.logger.error('Force shutting down after timeout.');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
startServer().catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});

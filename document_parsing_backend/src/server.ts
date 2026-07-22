import './utils/canvasMock';
import app from './app';
import { config } from './config/config';
import { connectDatabase } from './config/db';
import { logger } from './utils/logger';
import mongoose from 'mongoose';
import { WorkerService } from './workers/worker.service';
import { QueueService } from './queue/queue.service';
import { EmbeddingQueue } from './embedding/queue/embedding.queue';
import { VectorQueue } from './vector/queue/vector.queue';
import { VectorRepository } from './vector/repositories/vector.repository';

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectDatabase();

  // Ensure Vector Database Collection exists
  try {
    const vectorRepo = new VectorRepository();
    await vectorRepo.ensureCollection(config.vectorDimensions || 1536);
  } catch (err) {
    logger.error('Failed to initialize Qdrant collection:', err);
  }

  // Start background workers (monolith scale in local development)
  const workerService = WorkerService.getInstance();
  await workerService.startWorkers(1);

  const server = app.listen(config.port, () => {
    logger.info(`Server is running in [${config.env}] mode on port ${config.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);

    // Stop background workers first to prevent processing interruptions
    try {
      await workerService.stopWorkers();
      await QueueService.getInstance().shutdown();
      await EmbeddingQueue.getInstance().shutdown();
      await VectorQueue.getInstance().shutdown();
      logger.info('Queue and workers shut down successfully.');
    } catch (err) {
      logger.error('Error during worker cleanup:', err);
    }

    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnection:', err);
        process.exit(1);
      }
    });

    // Force close server after 10s if graceful shutdown fails
    setTimeout(() => {
      logger.error('Force shutting down after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

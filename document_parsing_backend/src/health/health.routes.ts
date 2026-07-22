import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { QdrantClient } from '@qdrant/js-client-rest';
import { config, queueConfig } from '../config/config';
import { WorkerService } from '../workers/worker.service';
import { QueueService } from '../queue/queue.service';
import { EmbeddingQueue } from '../embedding/queue/embedding.queue';
import { VectorQueue } from '../vector/queue/vector.queue';

const router = Router();

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
router.get('/live', (_req: Request, res: Response) => {
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
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {
    mongodb: 'DOWN',
    redis: 'DOWN',
    qdrant: 'DOWN',
    workers: 'DOWN',
  };

  let isHealthy = true;

  // 1. Check MongoDB ready state
  try {
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      checks.mongodb = 'UP';
    } else {
      isHealthy = false;
      checks.mongodb = `DOWN (ReadyState: ${readyState})`;
    }
  } catch (err: any) {
    isHealthy = false;
    checks.mongodb = `ERROR: ${err.message || err}`;
  }

  // 2. Check Redis ping
  let redisCheckClient: Redis | null = null;
  try {
    redisCheckClient = new Redis({
      host: queueConfig.redisHost,
      port: queueConfig.redisPort,
      password: queueConfig.redisPassword,
      maxRetriesPerRequest: 0,
      connectTimeout: 2000,
    });
    const pong = await redisCheckClient.ping();
    if (pong === 'PONG') {
      checks.redis = 'UP';
    } else {
      isHealthy = false;
      checks.redis = `DOWN (Response: ${pong})`;
    }
  } catch (err: any) {
    isHealthy = false;
    checks.redis = `ERROR: ${err.message || err}`;
  } finally {
    if (redisCheckClient) {
      try {
        await redisCheckClient.quit();
      } catch (e) {}
    }
  }

  // 3. Check Qdrant collections API
  try {
    const isMock = config.qdrantHost?.includes('mock') || (config.qdrantHost === 'http://localhost:6333' && config.env === 'test');
    if (isMock) {
      checks.qdrant = 'UP (MOCK)';
    } else {
      const qdrantClient = new QdrantClient({
        url: config.qdrantHost,
        apiKey: config.qdrantApiKey,
      });
      await qdrantClient.getCollections();
      checks.qdrant = 'UP';
    }
  } catch (err: any) {
    isHealthy = false;
    checks.qdrant = `ERROR: ${err.message || err}`;
  }

  // 4. Check Workers started
  try {
    const workerHealth = WorkerService.getInstance().getHealth();
    checks.workers = workerHealth.started ? `UP (${workerHealth.activeWorkers} active)` : 'DOWN';
    if (!workerHealth.started) {
      isHealthy = false;
    }
  } catch (err: any) {
    isHealthy = false;
    checks.workers = `ERROR: ${err.message || err}`;
  }

  // 5. Gather queues stats
  try {
    const [docQueue, embedQueue, vecQueue] = await Promise.all([
      QueueService.getInstance().getQueueStats().catch(() => null),
      EmbeddingQueue.getInstance().getQueueStats().catch(() => null),
      VectorQueue.getInstance().getQueueStats().catch(() => null),
    ]);
    checks.queues = {
      documentProcessing: docQueue,
      embeddingProcessing: embedQueue,
      vectorSync: vecQueue,
    };
  } catch (e) {}

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: isHealthy ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    details: checks,
  });
});

// GET /health - Compatibility route (triggers /ready validation)
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  const readyHandler = router.stack.find(s => s.route?.path === '/ready')?.route?.stack[0]?.handle;
  if (readyHandler) {
    readyHandler(req, res, next);
  } else {
    res.status(200).json({ status: 'UP' });
  }
});

export default router;

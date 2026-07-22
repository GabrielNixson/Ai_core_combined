import { Queue, Job } from 'bullmq';
import { getQueueConfig } from '../../queue/queue.config';
import { bindQueueEvents } from '../../queue/queue.events';
import { EmbeddingJobPayload, EmbeddingQueueStats } from '../models/embedding.types';
import { logger } from '../../utils/logger';
import { JOB_PRIORITIES } from '../../queue/queue.constants';

export const EMBEDDING_QUEUE_NAME = 'embedding-processing';
export const EMBEDDING_JOB_TYPE = 'EMBEDDING_JOB';

import { getRequestId, getCorrelationId } from '../../logging/correlation';

export class EmbeddingQueue {
  private static instance: EmbeddingQueue;
  private queue: Queue;

  private constructor() {
    const queueOptions = getQueueConfig();
    this.queue = new Queue(EMBEDDING_QUEUE_NAME, queueOptions);
    bindQueueEvents(this.queue);
    logger.info(`[Embedding Queue] Initialized queue: ${EMBEDDING_QUEUE_NAME}`);
  }

  public static getInstance(): EmbeddingQueue {
    if (!EmbeddingQueue.instance) {
      EmbeddingQueue.instance = new EmbeddingQueue();
    }
    return EmbeddingQueue.instance;
  }

  /**
   * Adds an embedding job to the queue.
   */
  public async addJob(
    payload: EmbeddingJobPayload,
    delay?: number
  ): Promise<Job> {
    const priority = JOB_PRIORITIES[payload.priority] || 20; // Default to NORMAL (20)
    const jobId = payload.documentId;

    // Propagate request context
    payload.requestId = payload.requestId || getRequestId();
    payload.correlationId = payload.correlationId || getCorrelationId();

    logger.info(`[Embedding Queue] Queuing job for document: ${payload.documentId} with priority: ${payload.priority}`);

    const job = await this.queue.add(EMBEDDING_JOB_TYPE, payload, {
      jobId,
      priority,
      delay,
    });

    return job;
  }

  /**
   * Removes a job from the queue if waiting/delayed.
   */
  public async removeJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'active') {
      logger.warn(`[Embedding Queue] Cannot remove job ${jobId} directly as it is currently active.`);
      return false;
    }

    await job.remove();
    logger.info(`[Embedding Queue] Successfully removed job ${jobId} from queue.`);
    return true;
  }

  /**
   * Cancels processing for a document.
   */
  public async cancelJob(documentId: string): Promise<boolean> {
    logger.info(`[Embedding Queue] Request to cancel job for document ID: ${documentId}`);
    return this.removeJob(documentId);
  }

  /**
   * Collects queue metric stats.
   */
  public async getQueueStats(): Promise<EmbeddingQueueStats> {
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
  public async shutdown(): Promise<void> {
    logger.info('[Embedding Queue] Closing queue connection.');
    await this.queue.close();
  }
}

export default EmbeddingQueue;

import { Queue, Job } from 'bullmq';
import { getQueueConfig } from '../../queue/queue.config';
import { bindQueueEvents } from '../../queue/queue.events';
import { VectorSyncJobPayload, VectorQueueStats } from '../models/vector.types';
import { logger } from '../../utils/logger';
import { JOB_PRIORITIES } from '../../queue/queue.constants';

export const VECTOR_SYNC_QUEUE_NAME = 'vector-sync-processing';
export const VECTOR_SYNC_JOB_TYPE = 'VECTOR_SYNC_JOB';

import { getRequestId, getCorrelationId } from '../../logging/correlation';

export class VectorQueue {
  private static instance: VectorQueue;
  private queue: Queue;

  private constructor() {
    const queueOptions = getQueueConfig();
    this.queue = new Queue(VECTOR_SYNC_QUEUE_NAME, queueOptions);
    bindQueueEvents(this.queue);
    logger.info(`[Vector Queue] Initialized queue: ${VECTOR_SYNC_QUEUE_NAME}`);
  }

  public static getInstance(): VectorQueue {
    if (!VectorQueue.instance) {
      VectorQueue.instance = new VectorQueue();
    }
    return VectorQueue.instance;
  }

  /**
   * Adds a vector sync job to the queue.
   */
  public async addJob(
    payload: VectorSyncJobPayload,
    delay?: number
  ): Promise<Job> {
    const priority = JOB_PRIORITIES[payload.priority] || 20;
    const jobId = payload.documentId;

    // Propagate request context
    payload.requestId = payload.requestId || getRequestId();
    payload.correlationId = payload.correlationId || getCorrelationId();

    logger.info(`[Vector Queue] Queuing vector sync job for document: ${payload.documentId} with priority: ${payload.priority}`);

    const job = await this.queue.add(VECTOR_SYNC_JOB_TYPE, payload, {
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
      logger.warn(`[Vector Queue] Cannot remove job ${jobId} directly as it is currently active.`);
      return false;
    }

    await job.remove();
    logger.info(`[Vector Queue] Successfully removed job ${jobId} from queue.`);
    return true;
  }

  /**
   * Cancels vector sync job for a document.
   */
  public async cancelJob(documentId: string): Promise<boolean> {
    logger.info(`[Vector Queue] Request to cancel vector sync job for document ID: ${documentId}`);
    return this.removeJob(documentId);
  }

  /**
   * Collects queue metric stats.
   */
  public async getQueueStats(): Promise<VectorQueueStats> {
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
    logger.info('[Vector Queue] Closing queue connection.');
    await this.queue.close();
  }
}

export default VectorQueue;

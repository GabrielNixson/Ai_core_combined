import { Queue, Job } from 'bullmq';
import { QUEUE_NAME, JobType, JOB_PRIORITIES, JobPriorityName } from './queue.constants';
import { getQueueConfig } from './queue.config';
import { DocumentJobPayload, QueueStats } from './queue.types';
import { bindQueueEvents } from './queue.events';
import { logger } from '../utils/logger';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentStatus } from '../models/Document';

import { getRequestId, getCorrelationId } from '../logging/correlation';

export class QueueService {
  private static instance: QueueService;
  private queue: Queue;
  private documentRepository: DocumentRepository;

  private constructor() {
    const queueOptions = getQueueConfig();
    this.queue = new Queue(QUEUE_NAME, queueOptions);
    this.documentRepository = new DocumentRepository();
    bindQueueEvents(this.queue);
    logger.info(`[Queue Service] Initialized queue: ${QUEUE_NAME}`);
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Adds a document processing job to the queue.
   */
  public async addJob(
    jobType: JobType,
    payload: DocumentJobPayload,
    priorityName: JobPriorityName = 'NORMAL',
    delay?: number
  ): Promise<Job> {
    const priority = JOB_PRIORITIES[priorityName];
    // Use documentId as the jobId to easily target/cancel it
    const jobId = payload.documentId;

    // Propagate request context
    payload.requestId = payload.requestId || getRequestId();
    payload.correlationId = payload.correlationId || getCorrelationId();

    logger.info(`[Queue Service] Queuing job of type '${jobType}' for document: ${payload.documentId} with priority: ${priorityName}`);

    // Update document status to QUEUED in the DB
    await this.documentRepository.updateStatus(payload.documentId, DocumentStatus.QUEUED, {
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
  public async removeJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'active') {
      logger.warn(`[Queue Service] Cannot remove job ${jobId} directly as it is currently active.`);
      return false;
    }

    await job.remove();
    logger.info(`[Queue Service] Successfully removed job ${jobId} from queue.`);
    return true;
  }

  /**
   * Cancels processing for a document.
   * If waiting/delayed: removes from queue.
   * If active: marks status to CANCELLED in DB to signal the worker.
   */
  public async cancelJob(documentId: string): Promise<boolean> {
    logger.info(`[Queue Service] Request to cancel job for document ID: ${documentId}`);

    // 1. Mark status as CANCELLED in MongoDB so active workers will abort
    await this.documentRepository.updateStatus(documentId, DocumentStatus.CANCELLED);

    // 2. Try to remove the job from the queue if it's waiting/delayed
    const removed = await this.removeJob(documentId);
    return removed || true;
  }

  /**
   * Pauses the queue.
   */
  public async pauseQueue(): Promise<void> {
    logger.info('[Queue Service] Pausing queue.');
    await this.queue.pause();
  }

  /**
   * Resumes the queue.
   */
  public async resumeQueue(): Promise<void> {
    logger.info('[Queue Service] Resuming queue.');
    await this.queue.resume();
  }

  /**
   * Collects queue metric stats.
   */
  public async getQueueStats(): Promise<QueueStats> {
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
  public async cleanQueue(grace: number = 0): Promise<void> {
    await this.queue.clean(grace, 1000, 'completed');
    await this.queue.clean(grace, 1000, 'failed');
  }

  /**
   * Graceful shutdown.
   */
  public async shutdown(): Promise<void> {
    logger.info('[Queue Service] Closing queue connection.');
    await this.queue.close();
  }
}
export default QueueService;

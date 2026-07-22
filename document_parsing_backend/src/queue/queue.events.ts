import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';

/**
 * Registers event listeners on a Queue instance to log events.
 */
export const bindQueueEvents = (queue: Queue) => {
  queue.on('error', (err) => {
    logger.error(`[Queue Event] Queue '${queue.name}' error:`, err);
  });
};

/**
 * Registers event listeners on a Worker instance to log progress, success, and failures.
 */
export const bindWorkerEvents = (worker: Worker) => {
  worker.on('active', (job: Job) => {
    logger.info(`[Worker Event] Job '${job.id}' of type '${job.name}' has started processing.`);
  });

  worker.on('completed', (job: Job) => {
    logger.info(`[Worker Event] Job '${job.id}' of type '${job.name}' has successfully completed.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[Worker Event] Job '${job?.id}' of type '${job?.name}' failed. Error: ${err.message}`);
  });

  worker.on('progress', (job: Job, progress: any) => {
    logger.debug(`[Worker Event] Job '${job.id}' reported progress: ${JSON.stringify(progress)}`);
  });

  worker.on('error', (err) => {
    logger.error(`[Worker Event] Worker internal error:`, err);
  });
};
export default bindQueueEvents;

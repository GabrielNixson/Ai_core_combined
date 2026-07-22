import { ConnectionOptions } from 'bullmq';
import { config } from '../config/config';

/**
 * Returns the ConnectionOptions configuration required for BullMQ/ioredis connection.
 */
export const getRedisConnection = (): ConnectionOptions => {
  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    // Critical BullMQ requirement: ioredis must not have maxRetriesPerRequest enabled
    maxRetriesPerRequest: null,
  };
};

/**
 * Returns default configuration options for queues.
 */
export const getQueueConfig = () => {
  return {
    connection: getRedisConnection(),
    prefix: config.queuePrefix,
    defaultJobOptions: {
      removeOnComplete: true, // Auto clean completed jobs
      removeOnFail: false,   // Retain failures for logs / debugging
      attempts: config.maxRetries,
      backoff: {
        type: 'exponential' as const,
        delay: config.retryDelay,
      },
    },
  };
};
export default getRedisConnection;

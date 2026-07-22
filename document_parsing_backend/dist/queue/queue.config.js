"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueConfig = exports.getRedisConnection = void 0;
const config_1 = require("../config/config");
/**
 * Returns the ConnectionOptions configuration required for BullMQ/ioredis connection.
 */
const getRedisConnection = () => {
    return {
        host: config_1.config.redisHost,
        port: config_1.config.redisPort,
        password: config_1.config.redisPassword,
        // Critical BullMQ requirement: ioredis must not have maxRetriesPerRequest enabled
        maxRetriesPerRequest: null,
    };
};
exports.getRedisConnection = getRedisConnection;
/**
 * Returns default configuration options for queues.
 */
const getQueueConfig = () => {
    return {
        connection: (0, exports.getRedisConnection)(),
        prefix: config_1.config.queuePrefix,
        defaultJobOptions: {
            removeOnComplete: true, // Auto clean completed jobs
            removeOnFail: false, // Retain failures for logs / debugging
            attempts: config_1.config.maxRetries,
            backoff: {
                type: 'exponential',
                delay: config_1.config.retryDelay,
            },
        },
    };
};
exports.getQueueConfig = getQueueConfig;
exports.default = exports.getRedisConnection;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindWorkerEvents = exports.bindQueueEvents = void 0;
const logger_1 = require("../utils/logger");
/**
 * Registers event listeners on a Queue instance to log events.
 */
const bindQueueEvents = (queue) => {
    queue.on('error', (err) => {
        logger_1.logger.error(`[Queue Event] Queue '${queue.name}' error:`, err);
    });
};
exports.bindQueueEvents = bindQueueEvents;
/**
 * Registers event listeners on a Worker instance to log progress, success, and failures.
 */
const bindWorkerEvents = (worker) => {
    worker.on('active', (job) => {
        logger_1.logger.info(`[Worker Event] Job '${job.id}' of type '${job.name}' has started processing.`);
    });
    worker.on('completed', (job) => {
        logger_1.logger.info(`[Worker Event] Job '${job.id}' of type '${job.name}' has successfully completed.`);
    });
    worker.on('failed', (job, err) => {
        logger_1.logger.error(`[Worker Event] Job '${job?.id}' of type '${job?.name}' failed. Error: ${err.message}`);
    });
    worker.on('progress', (job, progress) => {
        logger_1.logger.debug(`[Worker Event] Job '${job.id}' reported progress: ${JSON.stringify(progress)}`);
    });
    worker.on('error', (err) => {
        logger_1.logger.error(`[Worker Event] Worker internal error:`, err);
    });
};
exports.bindWorkerEvents = bindWorkerEvents;
exports.default = exports.bindQueueEvents;

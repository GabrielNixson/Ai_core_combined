"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingPipeline = void 0;
const logger_1 = require("../../utils/logger");
class ProcessingPipeline {
    stages = [];
    /**
     * Adds a processing stage to the pipeline.
     */
    addStage(stage) {
        this.stages.push(stage);
        return this;
    }
    /**
     * Executes all stages sequentially, feeding the output of one stage
     * as the input to the next stage.
     */
    async execute(initialContext) {
        let context = { ...initialContext };
        logger_1.logger.info(`Starting pipeline execution for document ID: ${context.documentId}`);
        for (const stage of this.stages) {
            logger_1.logger.info(`[Pipeline Stage Start] - Running stage: ${stage.name}`);
            const startTime = Date.now();
            try {
                context = await stage.execute(context);
                const duration = Date.now() - startTime;
                logger_1.logger.info(`[Pipeline Stage Success] - Completed stage: ${stage.name} in ${duration}ms`);
            }
            catch (error) {
                logger_1.logger.error(`[Pipeline Stage Failure] - Error in stage ${stage.name}:`, error);
                throw error;
            }
        }
        logger_1.logger.info(`Pipeline execution completed successfully for document ID: ${context.documentId}`);
        return context;
    }
}
exports.ProcessingPipeline = ProcessingPipeline;
exports.default = ProcessingPipeline;

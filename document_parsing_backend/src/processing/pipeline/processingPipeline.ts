import { ProcessingContext } from '../context/processingContext';
import { ProcessingStage } from './processingStage.interface';
import { logger } from '../../utils/logger';

export class ProcessingPipeline {
  private stages: ProcessingStage[] = [];

  /**
   * Adds a processing stage to the pipeline.
   */
  public addStage(stage: ProcessingStage): this {
    this.stages.push(stage);
    return this;
  }

  /**
   * Executes all stages sequentially, feeding the output of one stage
   * as the input to the next stage.
   */
  public async execute(initialContext: ProcessingContext): Promise<ProcessingContext> {
    let context = { ...initialContext };
    logger.info(`Starting pipeline execution for document ID: ${context.documentId}`);

    for (const stage of this.stages) {
      logger.info(`[Pipeline Stage Start] - Running stage: ${stage.name}`);
      const startTime = Date.now();
      try {
        context = await stage.execute(context);
        const duration = Date.now() - startTime;
        logger.info(`[Pipeline Stage Success] - Completed stage: ${stage.name} in ${duration}ms`);
      } catch (error) {
        logger.error(`[Pipeline Stage Failure] - Error in stage ${stage.name}:`, error);
        throw error;
      }
    }

    logger.info(`Pipeline execution completed successfully for document ID: ${context.documentId}`);
    return context;
  }
}
export default ProcessingPipeline;

import { ProcessingContext } from '../context/processingContext';

export interface ProcessingStage {
  readonly name: string;
  execute(context: ProcessingContext): Promise<ProcessingContext>;
}
export default ProcessingStage;

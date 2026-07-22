import { AgentState } from '../state';
import { logger } from '../../../utils/logger';

export async function toolSelectionNode(state: AgentState): Promise<Partial<AgentState>> {
  const plan = state.metadata.plan || {};
  const selectedTools: string[] = [];

  if (plan.needRAG) {
    selectedTools.push('askRAG');
  }
  if (plan.needSearch) {
    selectedTools.push('searchDocuments');
  }
  if (plan.needMetadata) {
    selectedTools.push('getMetadata');
  }

  const updatedMetadata = {
    ...state.metadata,
    selectedTools,
  };

  logger.info(`[Tool Selection Node] Selected tools: ${JSON.stringify(selectedTools)}`);
  return { metadata: updatedMetadata };
}

export default toolSelectionNode;

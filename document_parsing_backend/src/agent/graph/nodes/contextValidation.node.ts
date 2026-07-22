import { AgentState } from '../state';
import { logger } from '../../../utils/logger';

export async function contextValidationNode(state: AgentState): Promise<Partial<AgentState>> {
  const plan = state.metadata.plan || {};
  const metadata = { ...state.metadata };

  if (plan.needRAG) {
    const hasContext = state.sources && state.sources.length > 0;
    metadata.contextIsValid = hasContext;
    if (!hasContext) {
      logger.warn('[Context Validation Node] Warning: RAG was executed but returned empty context sources.');
    } else {
      logger.info('[Context Validation Node] Context validation passed.');
    }
  } else {
    metadata.contextIsValid = true;
  }

  return { metadata };
}

export default contextValidationNode;

import { AgentState } from '../state';
import { logger } from '../../../utils/logger';

export async function planningNode(state: AgentState): Promise<Partial<AgentState>> {
  const intent = state.intent;
  const metadata = { ...state.metadata };

  let needRAG = false;
  let needMetadata = false;
  let needSearch = false;
  let canAnswerDirectly = false;

  switch (intent) {
    case 'Document Search':
      needSearch = true;
      break;
    case 'Metadata Request':
      needMetadata = true;
      break;
    case 'Question Answering':
    case 'Summarization':
    case 'Comparison':
      needRAG = true;
      break;
    case 'General Chat':
    default:
      canAnswerDirectly = true;
      break;
  }

  metadata.plan = { needRAG, needMetadata, needSearch, canAnswerDirectly };
  logger.info(`[Planning Node] Selected Plan: ${JSON.stringify(metadata.plan)}`);
  
  return { metadata };
}

export default planningNode;

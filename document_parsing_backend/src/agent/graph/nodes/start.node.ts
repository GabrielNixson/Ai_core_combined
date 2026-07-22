import { AgentState } from '../state';
import { InMemoryMemoryProvider } from '../../memory/inMemory.provider';
import { logger } from '../../../utils/logger';

export async function startNode(state: AgentState): Promise<Partial<AgentState>> {
  logger.info(`[Start Node] Starting agent workflow for query: "${state.currentQuery}"`);
  
  const conversationId = state.conversationId;
  const memory = InMemoryMemoryProvider.getInstance();
  const history = await memory.getMessages(conversationId);

  const mergedMessages = [...history];
  
  // Append current query to messages if not already present in history
  if (state.currentQuery && !history.some(m => m.content === state.currentQuery && m.role === 'user')) {
    mergedMessages.push({ role: 'user', content: state.currentQuery });
  }

  return {
    messages: mergedMessages,
    toolResults: [],
    sources: [],
    retrievedContext: '',
    llmResponse: '',
  };
}

export default startNode;

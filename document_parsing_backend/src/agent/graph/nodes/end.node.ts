import { AgentState } from '../state';
import { InMemoryMemoryProvider } from '../../memory/inMemory.provider';
import { logger } from '../../../utils/logger';

export async function endNode(state: AgentState): Promise<Partial<AgentState>> {
  logger.info('[End Node] Saving final generated agent response to memory store.');

  if (state.llmResponse) {
    const memory = InMemoryMemoryProvider.getInstance();
    // Save user's original message if it's not already in memory
    const history = await memory.getMessages(state.conversationId);
    if (state.currentQuery && !history.some(m => m.content === state.currentQuery && m.role === 'user')) {
      await memory.saveMessage(state.conversationId, {
        role: 'user',
        content: state.currentQuery,
      });
    }
    
    // Save agent's reply
    await memory.saveMessage(state.conversationId, {
      role: 'assistant',
      content: state.llmResponse,
    });
  }

  return {};
}

export default endNode;

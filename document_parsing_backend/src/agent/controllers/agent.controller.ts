import { Request, Response, NextFunction } from 'express';
import { agentGraph } from '../graph/graph';
import { InMemoryMemoryProvider } from '../memory/inMemory.provider';
import { logger } from '../../utils/logger';

export class AgentController {
  /**
   * POST /agent/chat
   * Invokes the LangGraph state orchestrator.
   */
  public chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId, query, userId, metadata } = req.body;
      if (!conversationId || typeof conversationId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid conversationId.' });
        return;
      }
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query.' });
        return;
      }

      // Configure LangGraph thread checkpointer configuration
      const graphConfig = { configurable: { thread_id: conversationId } };

      const initialState = {
        conversationId,
        userId: userId || 'anonymous',
        currentQuery: query,
        metadata: metadata || {},
      };

      logger.info(`[Agent Controller] Invoking LangGraph workflow thread: ${conversationId}`);
      
      const finalState = await agentGraph.invoke(initialState, graphConfig);

      res.status(200).json({
        conversationId: finalState.conversationId,
        intent: finalState.intent,
        llmResponse: finalState.llmResponse,
        sources: finalState.sources,
        toolResults: finalState.toolResults,
        messages: finalState.messages,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /agent/query
   * Alias for chat.
   */
  public query = this.chat;

  /**
   * POST /agent/reset
   * Clears state for a conversationId.
   */
  public reset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId } = req.body;
      if (!conversationId) {
        res.status(400).json({ error: 'Missing conversationId parameter.' });
        return;
      }

      const memory = InMemoryMemoryProvider.getInstance();
      await memory.clear(conversationId);

      // Reset the checkpointer state by updating the thread state to empty
      const graphConfig = { configurable: { thread_id: conversationId } };
      await agentGraph.updateState(graphConfig, {
        messages: [],
        currentQuery: '',
        intent: '',
        retrievedContext: '',
        toolResults: [],
        llmResponse: '',
        sources: [],
        metadata: {},
      });

      logger.info(`[Agent Controller] Cleared and reset graph thread: ${conversationId}`);
      res.status(200).json({ success: true, message: `Reset state and memory for thread: ${conversationId}` });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /agent/state/:conversationId
   * Retrieves thread state values from checkpoint.
   */
  public getState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({ error: 'Missing conversationId parameter.' });
        return;
      }

      const graphConfig = { configurable: { thread_id: conversationId } };
      const threadState = await agentGraph.getState(graphConfig);

      res.status(200).json({
        threadId: conversationId,
        exists: !!threadState.values,
        state: threadState.values || null,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AgentController;

import { Request, Response, NextFunction } from 'express';
import { RAGService, RAGMetricsTracker } from '../services/rag.service';
import { config } from '../../config/config';

export class RAGController {
  private ragService: RAGService;

  constructor(ragService = new RAGService()) {
    this.ragService = ragService;
  }

  /**
   * POST /rag/query
   * Orchestrates retrieval augmented generation query flow.
   */
  public query = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, llmConfig, retrievalOptions } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const response = await this.ragService.generateAnswer(
        query,
        filters,
        llmConfig,
        retrievalOptions
      );
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /rag/ask
   * Alias endpoint for query.
   */
  public ask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, llmConfig, retrievalOptions } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const response = await this.ragService.generateAnswer(
        query,
        filters,
        llmConfig,
        retrievalOptions
      );
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /rag/test
   * Runs query and exposes latency profile and global metrics.
   */
  public test = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, llmConfig, retrievalOptions } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const start = Date.now();
      const response = await this.ragService.generateAnswer(
        query,
        filters,
        llmConfig,
        retrievalOptions
      );
      const totalTime = Date.now() - start;

      const tracker = RAGMetricsTracker.getInstance();
      const stats = tracker.getStats();

      res.status(200).json({
        success: true,
        executionTimeMs: totalTime,
        response,
        stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /rag/config
   * Returns current default RAG system configuration settings.
   */
  public getConfig = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({
        provider: config.ragLlmProvider,
        model: config.ragLlmModel,
        temperature: config.ragLlmTemperature,
        maxTokens: config.ragLlmMaxTokens,
        systemPrompt: config.ragLlmSystemPrompt,
        enableRagCache: config.enableRagCache,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default RAGController;

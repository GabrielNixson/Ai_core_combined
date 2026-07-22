import { Request, Response, NextFunction } from 'express';
import { RetrievalService, RetrievalMetricsTracker } from '../services/retrieval.service';
import { config } from '../../config/config';

export class RetrievalController {
  private retrievalService: RetrievalService;

  constructor(retrievalService = new RetrievalService()) {
    this.retrievalService = retrievalService;
  }

  /**
   * POST /retrieval/search
   * Performs semantic vector search with optional metadata filtering and context expansion.
   */
  public search = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, options } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const results = await this.retrievalService.retrieve(query, filters, options);
      res.status(200).json({
        query,
        results,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /retrieval/query
   * Alias endpoint returning search matches.
   */
  public query = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, options } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const results = await this.retrievalService.retrieve(query, filters, options);
      res.status(200).json({
        query,
        results,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /retrieval/config
   * Returns current semantic retrieval engine configurations.
   */
  public getConfig = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({
        defaultTopK: config.retrievalDefaultTopK,
        minimumScore: config.retrievalMinimumScore,
        maxReturnedChunks: config.retrievalMaxReturnedChunks,
        enableNeighborExpansion: config.retrievalEnableNeighborExpansion,
        enableReranking: config.retrievalEnableReranking,
        enableRetrievalCache: config.enableRetrievalCache,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /retrieval/test
   * Runs search query and returns detailed diagnostic latency logs.
   */
  public test = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, filters, options } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query string parameter.' });
        return;
      }

      const start = Date.now();
      const results = await this.retrievalService.retrieve(query, filters, options);
      const totalTime = Date.now() - start;

      const tracker = RetrievalMetricsTracker.getInstance();
      const stats = tracker.getStats();

      res.status(200).json({
        query,
        resultsCount: results.length,
        executionTimeMs: totalTime,
        stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default RetrievalController;

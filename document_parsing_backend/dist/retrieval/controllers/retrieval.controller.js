"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalController = void 0;
const retrieval_service_1 = require("../services/retrieval.service");
const config_1 = require("../../config/config");
class RetrievalController {
    retrievalService;
    constructor(retrievalService = new retrieval_service_1.RetrievalService()) {
        this.retrievalService = retrievalService;
    }
    /**
     * POST /retrieval/search
     * Performs semantic vector search with optional metadata filtering and context expansion.
     */
    search = async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /retrieval/query
     * Alias endpoint returning search matches.
     */
    query = async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /retrieval/config
     * Returns current semantic retrieval engine configurations.
     */
    getConfig = async (_req, res, next) => {
        try {
            res.status(200).json({
                defaultTopK: config_1.config.retrievalDefaultTopK,
                minimumScore: config_1.config.retrievalMinimumScore,
                maxReturnedChunks: config_1.config.retrievalMaxReturnedChunks,
                enableNeighborExpansion: config_1.config.retrievalEnableNeighborExpansion,
                enableReranking: config_1.config.retrievalEnableReranking,
                enableRetrievalCache: config_1.config.enableRetrievalCache,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /retrieval/test
     * Runs search query and returns detailed diagnostic latency logs.
     */
    test = async (req, res, next) => {
        try {
            const { query, filters, options } = req.body;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Missing or invalid query string parameter.' });
                return;
            }
            const start = Date.now();
            const results = await this.retrievalService.retrieve(query, filters, options);
            const totalTime = Date.now() - start;
            const tracker = retrieval_service_1.RetrievalMetricsTracker.getInstance();
            const stats = tracker.getStats();
            res.status(200).json({
                query,
                resultsCount: results.length,
                executionTimeMs: totalTime,
                stats,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.RetrievalController = RetrievalController;
exports.default = RetrievalController;

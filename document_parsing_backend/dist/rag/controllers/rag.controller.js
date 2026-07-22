"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGController = void 0;
const rag_service_1 = require("../services/rag.service");
const config_1 = require("../../config/config");
class RAGController {
    ragService;
    constructor(ragService = new rag_service_1.RAGService()) {
        this.ragService = ragService;
    }
    /**
     * POST /rag/query
     * Orchestrates retrieval augmented generation query flow.
     */
    query = async (req, res, next) => {
        try {
            const { query, filters, llmConfig, retrievalOptions } = req.body;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Missing or invalid query string parameter.' });
                return;
            }
            const response = await this.ragService.generateAnswer(query, filters, llmConfig, retrievalOptions);
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /rag/ask
     * Alias endpoint for query.
     */
    ask = async (req, res, next) => {
        try {
            const { query, filters, llmConfig, retrievalOptions } = req.body;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Missing or invalid query string parameter.' });
                return;
            }
            const response = await this.ragService.generateAnswer(query, filters, llmConfig, retrievalOptions);
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /rag/test
     * Runs query and exposes latency profile and global metrics.
     */
    test = async (req, res, next) => {
        try {
            const { query, filters, llmConfig, retrievalOptions } = req.body;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Missing or invalid query string parameter.' });
                return;
            }
            const start = Date.now();
            const response = await this.ragService.generateAnswer(query, filters, llmConfig, retrievalOptions);
            const totalTime = Date.now() - start;
            const tracker = rag_service_1.RAGMetricsTracker.getInstance();
            const stats = tracker.getStats();
            res.status(200).json({
                success: true,
                executionTimeMs: totalTime,
                response,
                stats,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /rag/config
     * Returns current default RAG system configuration settings.
     */
    getConfig = async (_req, res, next) => {
        try {
            res.status(200).json({
                provider: config_1.config.ragLlmProvider,
                model: config_1.config.ragLlmModel,
                temperature: config_1.config.ragLlmTemperature,
                maxTokens: config_1.config.ragLlmMaxTokens,
                systemPrompt: config_1.config.ragLlmSystemPrompt,
                enableRagCache: config_1.config.enableRagCache,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.RAGController = RAGController;
exports.default = RAGController;

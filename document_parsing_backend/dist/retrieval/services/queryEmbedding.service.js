"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryEmbeddingService = void 0;
const openaiEmbedding_provider_1 = require("../../embedding/providers/openaiEmbedding.provider");
const retrieval_cache_1 = require("../cache/retrieval.cache");
const logger_1 = require("../../utils/logger");
class QueryEmbeddingService {
    provider;
    cache;
    constructor(provider = new openaiEmbedding_provider_1.OpenAIEmbeddingProvider()) {
        this.provider = provider;
        this.cache = retrieval_cache_1.RetrievalCache.getInstance();
    }
    /**
     * Generates vector coordinates for a query, consulting the cache first.
     */
    async generateEmbedding(query) {
        const cached = await this.cache.getEmbedding(query);
        if (cached) {
            logger_1.logger.info(`[Query Embedding Service] Query vector cache hit for: "${query.substring(0, 30)}..."`);
            return { vector: cached, latencyMs: 0 };
        }
        logger_1.logger.info(`[Query Embedding Service] Generating query vector embedding for: "${query.substring(0, 30)}..."`);
        const start = Date.now();
        const result = await this.provider.generateEmbeddings([query]);
        const latencyMs = Date.now() - start;
        if (result && result.length > 0 && result[0] !== undefined) {
            const vector = result[0];
            await this.cache.setEmbedding(query, vector);
            return { vector, latencyMs };
        }
        throw new Error('[Query Embedding Service] Failed to generate query embedding coordinates.');
    }
}
exports.QueryEmbeddingService = QueryEmbeddingService;
exports.default = QueryEmbeddingService;

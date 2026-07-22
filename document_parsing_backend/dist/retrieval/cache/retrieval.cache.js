"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class RetrievalCache {
    static instance;
    client = null;
    enabled;
    ttl = 300; // Default 5 minutes TTL for search results
    embeddingTtl = 86400; // 24 hours TTL for query embeddings
    // Metrics tracking
    hits = 0;
    misses = 0;
    constructor() {
        this.enabled = config_1.config.enableRetrievalCache;
        if (this.enabled) {
            try {
                this.client = new ioredis_1.default({
                    host: config_1.config.redisHost,
                    port: config_1.config.redisPort,
                    password: config_1.config.redisPassword,
                    maxRetriesPerRequest: 1, // Fail fast to avoid blocking app
                });
                this.client.on('error', (err) => {
                    logger_1.logger.error(`[Retrieval Cache] Redis Connection error: ${err.message}`);
                    this.enabled = false;
                });
                logger_1.logger.info('[Retrieval Cache] Initialized ioredis connection.');
            }
            catch (err) {
                logger_1.logger.error(`[Retrieval Cache] Failed to instantiate Redis client: ${err.message}`);
                this.enabled = false;
            }
        }
    }
    static getInstance() {
        if (!RetrievalCache.instance) {
            RetrievalCache.instance = new RetrievalCache();
        }
        return RetrievalCache.instance;
    }
    /**
     * Generates a stable SHA-256 hash.
     */
    hash(input) {
        return crypto_1.default.createHash('sha256').update(input).digest('hex');
    }
    /**
     * Caches and retrieves query embeddings.
     */
    async getEmbedding(query) {
        if (!this.enabled || !this.client)
            return null;
        const key = `retrieval:embedding:${this.hash(query)}`;
        try {
            const cached = await this.client.get(key);
            if (cached) {
                this.hits++;
                logger_1.logger.debug(`[Retrieval Cache] Embedding hit for query: "${query.substring(0, 30)}..."`);
                return JSON.parse(cached);
            }
            this.misses++;
            return null;
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to get cached embedding: ${err.message}`);
            return null;
        }
    }
    async setEmbedding(query, embedding) {
        if (!this.enabled || !this.client)
            return;
        const key = `retrieval:embedding:${this.hash(query)}`;
        try {
            await this.client.set(key, JSON.stringify(embedding), 'EX', this.embeddingTtl);
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to set cached embedding: ${err.message}`);
        }
    }
    /**
     * Caches and retrieves search results.
     */
    async getSearchResults(query, filters, options) {
        if (!this.enabled || !this.client)
            return null;
        const composite = JSON.stringify({ query, filters, options });
        const key = `retrieval:search:${this.hash(composite)}`;
        try {
            const cached = await this.client.get(key);
            if (cached) {
                this.hits++;
                logger_1.logger.debug(`[Retrieval Cache] Search results hit for query: "${query.substring(0, 30)}..."`);
                return JSON.parse(cached);
            }
            this.misses++;
            return null;
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to get cached search results: ${err.message}`);
            return null;
        }
    }
    async setSearchResults(query, filters, options, results) {
        if (!this.enabled || !this.client)
            return;
        const composite = JSON.stringify({ query, filters, options });
        const key = `retrieval:search:${this.hash(composite)}`;
        try {
            await this.client.set(key, JSON.stringify(results), 'EX', this.ttl);
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to set cached search results: ${err.message}`);
        }
    }
    /**
     * Caches and retrieves RAG Responses.
     */
    async getRagResponse(query, filters, llmConfig) {
        if (!this.enabled || !this.client)
            return null;
        const composite = JSON.stringify({ query, filters, llmConfig });
        const key = `rag:query:${this.hash(composite)}`;
        try {
            const cached = await this.client.get(key);
            if (cached) {
                this.hits++;
                logger_1.logger.debug(`[Retrieval Cache] RAG Response cache hit for: "${query.substring(0, 30)}..."`);
                return JSON.parse(cached);
            }
            this.misses++;
            return null;
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to get cached RAG response: ${err.message}`);
            return null;
        }
    }
    async setRagResponse(query, filters, llmConfig, response, ttlSeconds = this.ttl) {
        if (!this.enabled || !this.client)
            return;
        const composite = JSON.stringify({ query, filters, llmConfig });
        const key = `rag:query:${this.hash(composite)}`;
        try {
            await this.client.set(key, JSON.stringify(response), 'EX', ttlSeconds);
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Failed to cache RAG response: ${err.message}`);
        }
    }
    /**
     * Clear cache for testing.
     */
    async flushAll() {
        if (!this.enabled || !this.client)
            return;
        try {
            await this.client.flushdb();
            this.hits = 0;
            this.misses = 0;
            logger_1.logger.info('[Retrieval Cache] Cache cleared.');
        }
        catch (err) {
            logger_1.logger.error(`[Retrieval Cache] Flush failed: ${err.message}`);
        }
    }
    /**
     * Caching metrics tracking.
     */
    getStats() {
        const total = this.hits + this.misses;
        const ratio = total > 0 ? this.hits / total : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRatio: parseFloat(ratio.toFixed(2)),
        };
    }
    /**
     * Closes the active Redis client connection.
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.quit();
                logger_1.logger.info('[Retrieval Cache] Redis client disconnected.');
            }
            catch (err) {
                logger_1.logger.error(`[Retrieval Cache] Redis disconnect error: ${err.message}`);
            }
            this.client = null;
        }
    }
}
exports.RetrievalCache = RetrievalCache;
exports.default = RetrievalCache;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const openaiEmbedding_provider_1 = require("../providers/openaiEmbedding.provider");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class EmbeddingService {
    provider;
    batchSize;
    constructor(provider) {
        this.batchSize = config_1.config.embeddingBatchSize || 100;
        if (provider) {
            this.provider = provider;
        }
        else {
            const providerType = config_1.config.embeddingProvider || 'openai';
            if (providerType === 'openai') {
                this.provider = new openaiEmbedding_provider_1.OpenAIEmbeddingProvider();
            }
            else {
                throw new Error(`Unsupported embedding provider: ${providerType}`);
            }
        }
    }
    /**
     * Generates embeddings for a list of text strings using configured batch sizes.
     * Handles empty chunks safely by producing zero-filled vectors.
     */
    async generateEmbeddings(texts) {
        if (!texts || texts.length === 0) {
            return [];
        }
        const results = new Array(texts.length);
        const validIndices = [];
        const validTexts = [];
        // 1. Content Validation & Filtering
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            if (!text || text.trim() === '') {
                logger_1.logger.warn(`[Embedding Service] Found empty/whitespace chunk at index ${i}. Creating placeholder.`);
                results[i] = {
                    embedding: [],
                    dimensions: 0,
                };
            }
            else {
                validIndices.push(i);
                validTexts.push(text);
            }
        }
        // If there are no valid texts to embed, return the zero vector arrays immediately
        if (validTexts.length === 0) {
            const defaultDim = 1536; // OpenAI text-embedding-3-small default
            for (let i = 0; i < results.length; i++) {
                results[i] = {
                    embedding: new Array(defaultDim).fill(0),
                    dimensions: defaultDim,
                };
            }
            return results;
        }
        // 2. Batching execution
        const allEmbeddings = [];
        for (let i = 0; i < validTexts.length; i += this.batchSize) {
            const batch = validTexts.slice(i, i + this.batchSize);
            logger_1.logger.info(`[Embedding Service] Processing batch of size ${batch.length} (offset: ${i})`);
            const start = Date.now();
            const batchEmbeddings = await this.provider.generateEmbeddings(batch);
            const latency = Date.now() - start;
            logger_1.logger.info(`[Embedding Service] Batch completed in ${latency}ms for ${batch.length} items`);
            allEmbeddings.push(...batchEmbeddings);
        }
        // 3. Assemble results back to original indices
        const dimensions = allEmbeddings[0]?.length || 1536;
        for (let i = 0; i < validIndices.length; i++) {
            const originalIdx = validIndices[i];
            const embedding = allEmbeddings[i];
            if (originalIdx !== undefined && embedding !== undefined) {
                results[originalIdx] = {
                    embedding: embedding,
                    dimensions: dimensions,
                };
            }
        }
        // Backfill any zero vectors with the correct dimension size
        for (let i = 0; i < results.length; i++) {
            const res = results[i];
            if (!res || res.dimensions === 0) {
                results[i] = {
                    embedding: new Array(dimensions).fill(0),
                    dimensions: dimensions,
                };
            }
        }
        return results;
    }
}
exports.EmbeddingService = EmbeddingService;
exports.default = EmbeddingService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEmbeddingProvider = void 0;
const openai_1 = require("openai");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class OpenAIEmbeddingProvider {
    client = null;
    model;
    constructor(options) {
        const apiKey = options?.apiKey || config_1.config.openaiApiKey;
        this.model = options?.model || config_1.config.embeddingModel || 'text-embedding-3-small';
        if (!apiKey || apiKey === 'mock-key-for-now') {
            logger_1.logger.warn('[OpenAI Embedding Provider] No valid API key provided. Provider will run in mock mode or error on real API calls.');
            this.client = null;
        }
        else {
            this.client = new openai_1.OpenAI({
                apiKey: apiKey,
                timeout: config_1.config.embeddingRequestTimeout || 30000,
            });
        }
    }
    async generateEmbedding(text) {
        const result = await this.generateEmbeddings([text]);
        const val = result[0];
        if (val === undefined) {
            throw new Error('Failed to generate embedding');
        }
        return val;
    }
    async generateEmbeddings(texts) {
        if (!texts || texts.length === 0) {
            return [];
        }
        // Handle mock API key for local testing/development/CI
        const apiKey = config_1.config.openaiApiKey;
        if (!this.client || !apiKey || apiKey === 'mock-key-for-now') {
            logger_1.logger.info(`[OpenAI Embedding Provider] MOCK MODE: Generating embeddings via Ollama nomic-embed-text for ${texts.length} inputs.`);
            try {
                const embeddings = [];
                const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://192.168.2.210:11434';
                const cleanBase = ollamaBaseUrl.replace(/\/$/, '');
                for (const text of texts) {
                    const response = await fetch(`${cleanBase}/api/embeddings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'nomic-embed-text:latest', prompt: text })
                    });
                    if (!response.ok) {
                        throw new Error(`Ollama embedding call failed: status ${response.status}`);
                    }
                    const data = await response.json();
                    let vector = data.embedding;
                    if (vector.length < 1536) {
                        vector = [...vector, ...Array(1536 - vector.length).fill(0)];
                    }
                    embeddings.push(vector);
                }
                return embeddings;
            }
            catch (err) {
                logger_1.logger.warn(`[OpenAI Embedding Provider] Fallback from Ollama to random mock embeddings due to error: ${err.message}`);
                return texts.map(() => Array.from({ length: 1536 }, () => Math.random() - 0.5));
            }
        }
        try {
            logger_1.logger.debug(`[OpenAI Embedding Provider] Requesting embeddings for ${texts.length} inputs using model ${this.model}`);
            const start = Date.now();
            const response = await this.client.embeddings.create({
                model: this.model,
                input: texts,
            });
            const latency = Date.now() - start;
            logger_1.logger.info(`[OpenAI Embedding Provider] Generated ${response.data.length} embeddings in ${latency}ms`);
            // Ensure ordering matches input
            const sortedData = [...response.data].sort((a, b) => a.index - b.index);
            return sortedData.map((item) => item.embedding);
        }
        catch (error) {
            logger_1.logger.error(`[OpenAI Embedding Provider] Failed to generate embeddings. Error: ${error.message || error}`);
            throw error;
        }
    }
}
exports.OpenAIEmbeddingProvider = OpenAIEmbeddingProvider;
exports.default = OpenAIEmbeddingProvider;

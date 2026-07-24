import { OpenAI } from 'openai';
import { EmbeddingProvider } from './embeddingProvider.interface';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI | null = null;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey || config.openaiApiKey;
    this.model = options?.model || config.embeddingModel || 'text-embedding-3-small';

    if (!apiKey || apiKey === 'mock-key-for-now') {
      logger.warn('[OpenAI Embedding Provider] No valid API key provided. Provider will run in mock mode or error on real API calls.');
      this.client = null;
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
        timeout: config.embeddingRequestTimeout || 30000,
      });
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.generateEmbeddings([text]);
    const val = result[0];
    if (val === undefined) {
      throw new Error('Failed to generate embedding');
    }
    return val;
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Handle mock API key for local testing/development/CI
    const apiKey = config.openaiApiKey;
    if (!this.client || !apiKey || apiKey === 'mock-key-for-now') {
      const ollamaBaseUrl = config.ollamaBaseUrl;
      const cleanBase = ollamaBaseUrl.replace(/\/$/, '');
      logger.info(`[OpenAI Embedding Provider] MOCK MODE: Requesting embeddings from local Ollama endpoint (${cleanBase}/api/embeddings) using model 'nomic-embed-text:latest' for ${texts.length} inputs.`);
      try {
        const embeddings: number[][] = [];
        const startTime = Date.now();
        
        for (const text of texts) {
          const response = await fetch(`${cleanBase}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text:latest', prompt: text })
          });
          if (!response.ok) {
            throw new Error(`Ollama embedding call failed: status ${response.status}`);
          }
          const data = await response.json() as { embedding: number[] };
          let vector = data.embedding;
          const targetDim = config.vectorDimensions || 768;
          if (vector.length < targetDim) {
            vector = [...vector, ...Array(targetDim - vector.length).fill(0)];
          } else if (vector.length > targetDim) {
            vector = vector.slice(0, targetDim);
          }
          embeddings.push(vector);
        }
        const latency = Date.now() - startTime;
        logger.info(`[OpenAI Embedding Provider] Successfully generated and configured ${embeddings.length} embeddings using Ollama 'nomic-embed-text:latest' in ${latency}ms.`);
        return embeddings;
      } catch (err: any) {
        logger.warn(`[OpenAI Embedding Provider] Fallback from Ollama to random mock embeddings due to error: ${err.message}`);
        const targetDim = config.vectorDimensions || 768;
        return texts.map(() => Array.from({ length: targetDim }, () => Math.random() - 0.5));
      }
    }

    try {
      logger.debug(`[OpenAI Embedding Provider] Requesting embeddings for ${texts.length} inputs using model ${this.model}`);
      const start = Date.now();
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });
      const latency = Date.now() - start;
      logger.info(`[OpenAI Embedding Provider] Generated ${response.data.length} embeddings in ${latency}ms`);

      // Ensure ordering matches input
      const sortedData = [...response.data].sort((a, b) => a.index - b.index);
      return sortedData.map((item) => item.embedding);
    } catch (error: any) {
      logger.error(`[OpenAI Embedding Provider] Failed to generate embeddings. Error: ${error.message || error}`);
      throw error;
    }
  }
}

export default OpenAIEmbeddingProvider;

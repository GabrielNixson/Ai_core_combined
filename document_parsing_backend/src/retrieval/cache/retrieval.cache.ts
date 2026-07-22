import Redis from 'ioredis';
import crypto from 'crypto';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export class RetrievalCache {
  private static instance: RetrievalCache;
  private client: Redis | null = null;
  private enabled: boolean;
  private ttl = 300; // Default 5 minutes TTL for search results
  private embeddingTtl = 86400; // 24 hours TTL for query embeddings

  // Metrics tracking
  private hits = 0;
  private misses = 0;

  private constructor() {
    this.enabled = config.enableRetrievalCache;
    if (this.enabled) {
      try {
        this.client = new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          maxRetriesPerRequest: 1, // Fail fast to avoid blocking app
        });

        this.client.on('error', (err) => {
          logger.error(`[Retrieval Cache] Redis Connection error: ${err.message}`);
          this.enabled = false;
        });

        logger.info('[Retrieval Cache] Initialized ioredis connection.');
      } catch (err: any) {
        logger.error(`[Retrieval Cache] Failed to instantiate Redis client: ${err.message}`);
        this.enabled = false;
      }
    }
  }

  public static getInstance(): RetrievalCache {
    if (!RetrievalCache.instance) {
      RetrievalCache.instance = new RetrievalCache();
    }
    return RetrievalCache.instance;
  }

  /**
   * Generates a stable SHA-256 hash.
   */
  private hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Caches and retrieves query embeddings.
   */
  public async getEmbedding(query: string): Promise<number[] | null> {
    if (!this.enabled || !this.client) return null;

    const key = `retrieval:embedding:${this.hash(query)}`;
    try {
      const cached = await this.client.get(key);
      if (cached) {
        this.hits++;
        logger.debug(`[Retrieval Cache] Embedding hit for query: "${query.substring(0, 30)}..."`);
        return JSON.parse(cached) as number[];
      }
      this.misses++;
      return null;
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to get cached embedding: ${err.message}`);
      return null;
    }
  }

  public async setEmbedding(query: string, embedding: number[]): Promise<void> {
    if (!this.enabled || !this.client) return;

    const key = `retrieval:embedding:${this.hash(query)}`;
    try {
      await this.client.set(key, JSON.stringify(embedding), 'EX', this.embeddingTtl);
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to set cached embedding: ${err.message}`);
    }
  }

  /**
   * Caches and retrieves search results.
   */
  public async getSearchResults(
    query: string,
    filters: Record<string, any>,
    options: Record<string, any>
  ): Promise<any[] | null> {
    if (!this.enabled || !this.client) return null;

    const composite = JSON.stringify({ query, filters, options });
    const key = `retrieval:search:${this.hash(composite)}`;
    try {
      const cached = await this.client.get(key);
      if (cached) {
        this.hits++;
        logger.debug(`[Retrieval Cache] Search results hit for query: "${query.substring(0, 30)}..."`);
        return JSON.parse(cached);
      }
      this.misses++;
      return null;
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to get cached search results: ${err.message}`);
      return null;
    }
  }

  public async setSearchResults(
    query: string,
    filters: Record<string, any>,
    options: Record<string, any>,
    results: any[]
  ): Promise<void> {
    if (!this.enabled || !this.client) return;

    const composite = JSON.stringify({ query, filters, options });
    const key = `retrieval:search:${this.hash(composite)}`;
    try {
      await this.client.set(key, JSON.stringify(results), 'EX', this.ttl);
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to set cached search results: ${err.message}`);
    }
  }

  /**
   * Caches and retrieves RAG Responses.
   */
  public async getRagResponse(
    query: string,
    filters: Record<string, any>,
    llmConfig: Record<string, any>
  ): Promise<any | null> {
    if (!this.enabled || !this.client) return null;

    const composite = JSON.stringify({ query, filters, llmConfig });
    const key = `rag:query:${this.hash(composite)}`;
    try {
      const cached = await this.client.get(key);
      if (cached) {
        this.hits++;
        logger.debug(`[Retrieval Cache] RAG Response cache hit for: "${query.substring(0, 30)}..."`);
        return JSON.parse(cached);
      }
      this.misses++;
      return null;
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to get cached RAG response: ${err.message}`);
      return null;
    }
  }

  public async setRagResponse(
    query: string,
    filters: Record<string, any>,
    llmConfig: Record<string, any>,
    response: any,
    ttlSeconds = this.ttl
  ): Promise<void> {
    if (!this.enabled || !this.client) return;

    const composite = JSON.stringify({ query, filters, llmConfig });
    const key = `rag:query:${this.hash(composite)}`;
    try {
      await this.client.set(key, JSON.stringify(response), 'EX', ttlSeconds);
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Failed to cache RAG response: ${err.message}`);
    }
  }

  /**
   * Clear cache for testing.
   */
  public async flushAll(): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.flushdb();
      this.hits = 0;
      this.misses = 0;
      logger.info('[Retrieval Cache] Cache cleared.');
    } catch (err: any) {
      logger.error(`[Retrieval Cache] Flush failed: ${err.message}`);
    }
  }

  /**
   * Caching metrics tracking.
   */
  public getStats() {
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
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('[Retrieval Cache] Redis client disconnected.');
      } catch (err: any) {
        logger.error(`[Retrieval Cache] Redis disconnect error: ${err.message}`);
      }
      this.client = null;
    }
  }
}

export default RetrievalCache;

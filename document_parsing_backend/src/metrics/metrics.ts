import { Request, Response, Router } from 'express';
import os from 'os';
import { QueueService } from '../queue/queue.service';
import { EmbeddingQueue } from '../embedding/queue/embedding.queue';
import { VectorQueue } from '../vector/queue/vector.queue';

class MetricsTracker {
  private static instance: MetricsTracker;

  private totalRequests = 0;
  private errorCount = 0;
  private statusCodes: Record<number, number> = {};
  private requestLatencies: number[] = [];

  private totalDocumentsProcessed = 0;
  private totalChunksGenerated = 0;
  private totalEmbeddingsGenerated = 0;
  private totalVectorSyncs = 0;

  private llmLatencies: number[] = [];
  private ragLatencies: number[] = [];
  private retrievalLatencies: number[] = [];
  private langgraphLatencies: number[] = [];

  private constructor() {}

  public static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker();
    }
    return MetricsTracker.instance;
  }

  public recordRequest(_method: string, _path: string, latency: number, statusCode: number) {
    this.totalRequests++;
    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
    this.requestLatencies.push(latency);
    if (this.requestLatencies.length > 1000) this.requestLatencies.shift(); // sliding window of 1000

    if (statusCode >= 400) {
      this.errorCount++;
    }
  }

  public recordDocumentProcessed() {
    this.totalDocumentsProcessed++;
  }

  public recordChunksGenerated(count: number) {
    this.totalChunksGenerated += count;
  }

  public recordEmbeddingsGenerated(count: number) {
    this.totalEmbeddingsGenerated += count;
  }

  public recordVectorSync(count: number) {
    this.totalVectorSyncs += count;
  }

  public recordLLMLatency(latency: number) {
    this.llmLatencies.push(latency);
    if (this.llmLatencies.length > 100) this.llmLatencies.shift();
  }

  public recordRAGLatency(latency: number) {
    this.ragLatencies.push(latency);
    if (this.ragLatencies.length > 100) this.ragLatencies.shift();
  }

  public recordRetrievalLatency(latency: number) {
    this.retrievalLatencies.push(latency);
    if (this.retrievalLatencies.length > 100) this.retrievalLatencies.shift();
  }

  public recordLangGraphLatency(latency: number) {
    this.langgraphLatencies.push(latency);
    if (this.langgraphLatencies.length > 100) this.langgraphLatencies.shift();
  }

  private getAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return parseFloat((sum / arr.length).toFixed(2));
  }

  public async getMetricsSummary() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    
    // Get Queue stats
    let docQueueStats = null;
    let embedQueueStats = null;
    let vecQueueStats = null;

    try {
      docQueueStats = await QueueService.getInstance().getQueueStats();
      embedQueueStats = await EmbeddingQueue.getInstance().getQueueStats();
      vecQueueStats = await VectorQueue.getInstance().getQueueStats();
    } catch (e) {}

    return {
      system: {
        memory: {
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        uptime: `${process.uptime().toFixed(0)}s`,
        loadAverage: os.loadavg(),
      },
      http: {
        totalRequests: this.totalRequests,
        errorCount: this.errorCount,
        averageLatencyMs: this.getAverage(this.requestLatencies),
        statusCodes: this.statusCodes,
      },
      pipelines: {
        documentsProcessed: this.totalDocumentsProcessed,
        chunksGenerated: this.totalChunksGenerated,
        embeddingsGenerated: this.totalEmbeddingsGenerated,
        vectorsSynced: this.totalVectorSyncs,
        averageRetrievalLatencyMs: this.getAverage(this.retrievalLatencies),
        averageRAGLatencyMs: this.getAverage(this.ragLatencies),
        averageLLMLatencyMs: this.getAverage(this.llmLatencies),
        averageLangGraphExecutionLatencyMs: this.getAverage(this.langgraphLatencies),
      },
      queues: {
        documentProcessing: docQueueStats,
        embeddingProcessing: embedQueueStats,
        vectorSync: vecQueueStats,
      },
    };
  }
}

export const metricsTracker = MetricsTracker.getInstance();

export const metricsRouter = Router();

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Retrieve real-time performance and system metrics
 *     tags: [Monitoring & Health]
 *     responses:
 *       200:
 *         description: Performance and system summary metrics
 */
metricsRouter.get('/', async (_req: Request, res: Response) => {
  const summary = await metricsTracker.getMetricsSummary();
  res.status(200).json(summary);
});

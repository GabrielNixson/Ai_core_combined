export class EmbeddingMetricsTracker {
  private static instance: EmbeddingMetricsTracker;

  private totalGenerated = 0;
  private totalLatencyMs = 0;
  private failedCount = 0;
  private retryCount = 0;
  private timestamps: number[] = [];

  private constructor() {}

  public static getInstance(): EmbeddingMetricsTracker {
    if (!EmbeddingMetricsTracker.instance) {
      EmbeddingMetricsTracker.instance = new EmbeddingMetricsTracker();
    }
    return EmbeddingMetricsTracker.instance;
  }

  public recordSuccess(count: number, latencyMs: number) {
    this.totalGenerated += count;
    this.totalLatencyMs += latencyMs;
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.timestamps.push(now);
    }
    this.pruneTimestamps();
  }

  public recordFailure(count: number = 1) {
    this.failedCount += count;
  }

  public recordRetry(count: number = 1) {
    this.retryCount += count;
  }

  public getStats() {
    this.pruneTimestamps();
    const avgLatency = this.totalGenerated > 0 ? this.totalLatencyMs / this.totalGenerated : 0;
    
    // Throughput in the last 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    const lastMinuteCount = this.timestamps.filter(t => t >= oneMinuteAgo).length;

    return {
      totalGenerated: this.totalGenerated,
      averageLatencyMs: parseFloat(avgLatency.toFixed(2)),
      failedCount: this.failedCount,
      retryCount: this.retryCount,
      throughputPerMinute: lastMinuteCount,
    };
  }

  private pruneTimestamps() {
    const cutoff = Date.now() - 300000; // Keep last 5 minutes
    this.timestamps = this.timestamps.filter(t => t >= cutoff);
  }
}

export default EmbeddingMetricsTracker;

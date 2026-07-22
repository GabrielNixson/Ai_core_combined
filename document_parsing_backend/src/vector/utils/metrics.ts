export class VectorMetricsTracker {
  private static instance: VectorMetricsTracker;

  private totalSynced = 0;
  private totalLatencyMs = 0;
  private failedCount = 0;
  private retryCount = 0;
  private timestamps: number[] = [];

  private constructor() {}

  public static getInstance(): VectorMetricsTracker {
    if (!VectorMetricsTracker.instance) {
      VectorMetricsTracker.instance = new VectorMetricsTracker();
    }
    return VectorMetricsTracker.instance;
  }

  public recordSuccess(count: number, latencyMs: number) {
    this.totalSynced += count;
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
    const avgLatency = this.totalSynced > 0 ? this.totalLatencyMs / this.totalSynced : 0;
    
    // Throughput in the last 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    const lastMinuteCount = this.timestamps.filter(t => t >= oneMinuteAgo).length;

    return {
      totalSynced: this.totalSynced,
      averageSyncLatencyMs: parseFloat(avgLatency.toFixed(2)),
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

export default VectorMetricsTracker;

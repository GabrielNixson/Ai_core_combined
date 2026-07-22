"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingMetricsTracker = void 0;
class EmbeddingMetricsTracker {
    static instance;
    totalGenerated = 0;
    totalLatencyMs = 0;
    failedCount = 0;
    retryCount = 0;
    timestamps = [];
    constructor() { }
    static getInstance() {
        if (!EmbeddingMetricsTracker.instance) {
            EmbeddingMetricsTracker.instance = new EmbeddingMetricsTracker();
        }
        return EmbeddingMetricsTracker.instance;
    }
    recordSuccess(count, latencyMs) {
        this.totalGenerated += count;
        this.totalLatencyMs += latencyMs;
        const now = Date.now();
        for (let i = 0; i < count; i++) {
            this.timestamps.push(now);
        }
        this.pruneTimestamps();
    }
    recordFailure(count = 1) {
        this.failedCount += count;
    }
    recordRetry(count = 1) {
        this.retryCount += count;
    }
    getStats() {
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
    pruneTimestamps() {
        const cutoff = Date.now() - 300000; // Keep last 5 minutes
        this.timestamps = this.timestamps.filter(t => t >= cutoff);
    }
}
exports.EmbeddingMetricsTracker = EmbeddingMetricsTracker;
exports.default = EmbeddingMetricsTracker;

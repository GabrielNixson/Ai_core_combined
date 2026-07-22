import { JobPriorityName } from '../../queue/queue.constants';

export enum ChunkEmbeddingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface EmbeddingJobPayload {
  documentId: string;
  chunkIds?: string[];
  processingVersion: number;
  priority: JobPriorityName;
  retryCount?: number;
  requestId?: string;
  correlationId?: string;
}

export interface EmbeddingQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  workerCount: number;
}

export interface GlobalEmbeddingStats {
  totalGenerated: number;
  averageLatencyMs: number;
  failedCount: number;
  retryCount: number;
  queueSize: number;
  throughputPerMinute: number;
}

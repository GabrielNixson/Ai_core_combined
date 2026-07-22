import { JobPriorityName } from '../../queue/queue.constants';

export enum VectorSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface VectorSyncJobPayload {
  documentId: string;
  chunkIds?: string[];
  processingVersion: number;
  priority: JobPriorityName;
  retryCount?: number;
  requestId?: string;
  correlationId?: string;
}

export interface VectorQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  workerCount: number;
}

export interface GlobalVectorStats {
  totalSynced: number;
  averageSyncLatencyMs: number;
  failedCount: number;
  retryCount: number;
  queueSize: number;
  throughputPerMinute: number;
}

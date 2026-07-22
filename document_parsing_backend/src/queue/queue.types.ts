import { JobPriorityName } from './queue.constants';

export interface DocumentJobPayload {
  documentId: string;
  documentType: string;
  storagePath: string;
  requestedBy: string;
  processingVersion: number;
  priority: JobPriorityName;
  retryCount: number;
  requestId?: string;
  correlationId?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  workerCount: number;
  averageProcessingTimeMs?: number;
}
export default DocumentJobPayload;

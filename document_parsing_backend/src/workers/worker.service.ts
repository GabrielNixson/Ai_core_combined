import { DocumentWorker } from './document.worker';
import { EmbeddingWorker } from '../embedding/workers/embedding.worker';
import { VectorSyncWorker } from '../vector/workers/vectorSync.worker';
import { logger } from '../utils/logger';

export class WorkerService {
  private static instance: WorkerService;
  private documentWorkers: DocumentWorker[] = [];
  private embeddingWorkers: EmbeddingWorker[] = [];
  private vectorSyncWorkers: VectorSyncWorker[] = [];
  private isStarted = false;

  private constructor() {}

  public static getInstance(): WorkerService {
    if (!WorkerService.instance) {
      WorkerService.instance = new WorkerService();
    }
    return WorkerService.instance;
  }

  /**
   * Starts worker instances. Concurrency is configured internally inside the workers.
   */
  public async startWorkers(instancesCount: number = 1): Promise<void> {
    if (this.isStarted) {
      logger.warn('[Worker Service] Workers have already been started. Skipping.');
      return;
    }

    logger.info(`[Worker Service] Starting ${instancesCount} document, embedding, and vector sync workers...`);

    for (let i = 0; i < instancesCount; i++) {
      const docWorker = new DocumentWorker();
      this.documentWorkers.push(docWorker);

      const embedWorker = new EmbeddingWorker();
      this.embeddingWorkers.push(embedWorker);

      const vectorWorker = new VectorSyncWorker();
      this.vectorSyncWorkers.push(vectorWorker);
    }

    this.isStarted = true;
    logger.info(`[Worker Service] Successfully registered and started ${this.documentWorkers.length} doc workers, ${this.embeddingWorkers.length} embedding workers, and ${this.vectorSyncWorkers.length} vector sync workers.`);
  }

  /**
   * Stop workers.
   */
  public async stopWorkers(): Promise<void> {
    if (!this.isStarted) {
      logger.warn('[Worker Service] No active workers to stop.');
      return;
    }

    logger.info('[Worker Service] Stopping worker connections...');
    await Promise.all([
      ...this.documentWorkers.map(w => w.close()),
      ...this.embeddingWorkers.map(w => w.close()),
      ...this.vectorSyncWorkers.map(w => w.close()),
    ]);
    this.documentWorkers = [];
    this.embeddingWorkers = [];
    this.vectorSyncWorkers = [];
    this.isStarted = false;
    logger.info('[Worker Service] All background workers stopped.');
  }

  /**
   * Worker tier health status.
   */
  public getHealth(): { started: boolean; activeWorkers: number } {
    return {
      started: this.isStarted,
      activeWorkers: this.documentWorkers.length + this.embeddingWorkers.length + this.vectorSyncWorkers.length,
    };
  }
}
export default WorkerService;

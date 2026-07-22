import { ProcessingStage } from '../processingStage.interface';
import { ProcessingContext } from '../../context/processingContext';
import { ChunkGenerationService } from '../../../chunking/services/chunkGeneration.service';
import { ChunkStorageService } from '../../../chunking/services/chunkStorage.service';
import { DocumentStorageService } from '../../../services/documentStorage.service';
import { DocumentStatus } from '../../../models/Document';
import { logger } from '../../../utils/logger';

export class ChunkStage implements ProcessingStage {
  public readonly name = 'ChunkStage';
  private chunkService: ChunkGenerationService;
  private chunkStorageService: ChunkStorageService;
  private documentStorageService: DocumentStorageService;

  constructor(
    chunkService = new ChunkGenerationService(),
    chunkStorageService = new ChunkStorageService(),
    documentStorageService = new DocumentStorageService()
  ) {
    this.chunkService = chunkService;
    this.chunkStorageService = chunkStorageService;
    this.documentStorageService = documentStorageService;
  }

  /**
   * Executes chunking, link indices, persists batches, and updates database records.
   */
  public async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!context.parsedDocument) {
      logger.warn(`[ChunkStage] No ParsedDocument found in context for document ID ${context.documentId}. Skipping chunking.`);
      return context;
    }

    const doc = await this.documentStorageService.getDocument(context.documentId);
    if (doc?.status === DocumentStatus.CANCELLED) {
      throw new Error('Job cancelled by user');
    }

    await this.documentStorageService.updateProcessingStatus(context.documentId, DocumentStatus.CHUNKING, {
      progress: 75,
    });

    logger.debug(`[ChunkStage] Generating chunks for document: ${context.documentId}`);
    const chunks = this.chunkService.generateChunks(context.parsedDocument);

    // Link sequential chunk IDs
    for (let i = 0; i < chunks.length; i++) {
      const current = chunks[i];
      if (!current) continue;

      if (i > 0) {
        const prev = chunks[i - 1];
        if (prev) {
          current.previousChunkId = prev.chunkId;
        }
      }
      if (i < chunks.length - 1) {
        const next = chunks[i + 1];
        if (next) {
          current.nextChunkId = next.chunkId;
        }
      }
    }

    await this.chunkStorageService.persistChunks(context.documentId, chunks);

    await this.documentStorageService.updateProcessingStatus(context.documentId, DocumentStatus.CHUNKED, {
      chunksCount: chunks.length,
      progress: 75,
    });

    return {
      ...context,
      chunks,
    };
  }
}
export default ChunkStage;

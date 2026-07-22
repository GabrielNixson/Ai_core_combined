import { IChunkRepository } from '../../interfaces/chunkRepository.interface';
import { ChunkRepository } from '../repositories/chunk.repository';
import { DocumentChunk } from '../../types/documentChunk';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export class ChunkStorageService {
  private chunkRepository: IChunkRepository;

  constructor(chunkRepository: IChunkRepository = new ChunkRepository()) {
    this.chunkRepository = chunkRepository;
  }

  /**
   * Persists document chunks to MongoDB in batched writes matching batchInsertSize config.
   */
  public async persistChunks(
    documentId: string,
    chunks: DocumentChunk[]
  ): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];

    logger.debug(`[Chunk Storage] Saving ${chunks.length} chunks for document: ${documentId}`);

    // Pre-clear existing chunks to avoid duplicates
    await this.chunkRepository.deleteChunks(documentId);

    const batchSize = config.batchInsertSize || 100;
    const inserted: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      logger.debug(`[Chunk Storage] Batch inserting ${batch.length} chunks (offset: ${i})`);
      const res = await this.chunkRepository.createMany(batch);
      inserted.push(...res);
    }

    return inserted;
  }

  /**
   * Retrieves all chunks stored for a documentId.
   */
  public async retrieveChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkRepository.findByDocument(documentId);
  }

  /**
   * Counts the chunks stored for a documentId.
   */
  public async countChunks(documentId: string): Promise<number> {
    return this.chunkRepository.countChunks(documentId);
  }

  /**
   * Cleans up chunks stored for a documentId.
   */
  public async deleteChunks(documentId: string): Promise<boolean> {
    return this.chunkRepository.deleteChunks(documentId);
  }
}
export default ChunkStorageService;

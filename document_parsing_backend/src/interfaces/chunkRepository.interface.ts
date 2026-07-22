import { IRepository } from './repository.interface';
import { DocumentChunk } from '../types/documentChunk';

export interface IChunkRepository extends IRepository<DocumentChunk> {
  /**
   * Bulk inserts a list of document chunk objects.
   */
  createMany(chunks: Partial<DocumentChunk>[]): Promise<DocumentChunk[]>;

  /**
   * Bulk inserts a list of document chunk objects. Alias for createMany to support insertMany.
   */
  insertMany(chunks: Partial<DocumentChunk>[]): Promise<DocumentChunk[]>;

  /**
   * Finds all chunks associated with a specific documentId.
   */
  findByDocument(documentId: string): Promise<DocumentChunk[]>;

  /**
   * Finds a specific chunk by its chunkId.
   */
  findChunk(chunkId: string): Promise<DocumentChunk | null>;

  /**
   * Deletes all chunks associated with a specific documentId.
   */
  deleteChunks(documentId: string): Promise<boolean>;

  /**
   * Counts the number of chunks associated with a specific documentId.
   */
  countChunks(documentId: string): Promise<number>;
}
export default IChunkRepository;

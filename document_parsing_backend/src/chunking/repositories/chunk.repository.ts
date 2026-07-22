import { BaseRepository } from '../../repositories/base.repository';
import { DocumentChunk } from '../../types/documentChunk';
import { ChunkModel, DocumentChunkMongoose } from '../models/documentChunk';
import { IChunkRepository } from '../../interfaces/chunkRepository.interface';

export class ChunkRepository
  extends BaseRepository<DocumentChunk, DocumentChunkMongoose>
  implements IChunkRepository
{
  constructor() {
    super(ChunkModel);
  }

  /**
   * Bulk inserts a list of document chunk objects, utilizing the session context if provided.
   */
  public async createMany(chunks: Partial<DocumentChunk>[], session?: any): Promise<DocumentChunk[]> {
    const docs = await ChunkModel.insertMany(chunks, { session });
    return docs.map(doc => doc.toObject() as unknown as DocumentChunk);
  }

  /**
   * Bulk inserts a list of document chunk objects. Alias for createMany.
   */
  public async insertMany(chunks: Partial<DocumentChunk>[], session?: any): Promise<DocumentChunk[]> {
    return this.createMany(chunks, session);
  }

  /**
   * Retrieves all chunks belonging to a documentId.
   */
  public async findByDocument(documentId: string, session?: any): Promise<DocumentChunk[]> {
    return this.find({ documentId }, session);
  }

  /**
   * Looks up a specific chunk by its chunkId.
   */
  public async findChunk(chunkId: string, session?: any): Promise<DocumentChunk | null> {
    return this.findOne({ chunkId }, session);
  }

  /**
   * Deletes all chunks associated with a documentId.
   */
  public async deleteChunks(documentId: string, session?: any): Promise<boolean> {
    const result = await ChunkModel.deleteMany({ documentId }, { session }).exec();
    return (result.deletedCount ?? 0) > 0;
  }

  /**
   * Returns total chunk records matching a documentId.
   */
  public async countChunks(documentId: string, session?: any): Promise<number> {
    return ChunkModel.countDocuments({ documentId }).session(session || null).exec();
  }
}
export default ChunkRepository;

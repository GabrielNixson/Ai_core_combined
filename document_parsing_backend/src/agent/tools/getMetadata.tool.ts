import { Tool } from './tool.interface';
import { DocumentModel } from '../../models/Document';
import { ChunkModel } from '../../chunking/models/documentChunk';
import { logger } from '../../utils/logger';

export class GetMetadataTool implements Tool {
  public name = 'getMetadata';
  public description = 'Retrieves document details, metadata, or specific chunks. Inputs: action ("getDocumentMetadata" | "getDocumentById" | "getChunk"), documentId (optional string), chunkId (optional string).';

  public async execute(input: { action: string; documentId?: string; chunkId?: string }): Promise<any> {
    logger.info(`[Get Metadata Tool] Action: ${input.action}`);
    
    if (input.action === 'getDocumentMetadata' || input.action === 'getDocumentById') {
      if (!input.documentId) {
        throw new Error('documentId is required for this action');
      }
      const doc = await DocumentModel.findOne({ documentId: input.documentId }).lean();
      return doc || { error: 'Document not found' };
    }
    
    if (input.action === 'getChunk') {
      if (!input.chunkId) {
        throw new Error('chunkId is required for this action');
      }
      const chunk = await ChunkModel.findOne({ chunkId: input.chunkId }).lean();
      return chunk || { error: 'Chunk not found' };
    }

    throw new Error(`Unsupported action: ${input.action}`);
  }
}

export default GetMetadataTool;

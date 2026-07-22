import { ContentBlock } from '../../types/parsedDocument';

export interface ChunkMetadataContext {
  documentId: string;
  title: string;
  section?: string;
  sourceType: string;
}

export interface RawChunk {
  content: string;
  contentType: string;
  pageStart?: number;
  pageEnd?: number;
  slideNumber?: number;
  metadata?: Record<string, any>;
}

export interface ChunkStrategy {
  /**
   * Decomposes a ContentBlock into raw, unmerged document chunks.
   */
  chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[];
}
export default ChunkStrategy;

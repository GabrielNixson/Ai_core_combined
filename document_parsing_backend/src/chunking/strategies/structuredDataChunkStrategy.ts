import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class StructuredDataChunkStrategy implements ChunkStrategy {
  /**
   * Transforms structured documents (JSON or XML) into raw structured data chunks.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[] {
    let rawContent = '';

    if (block.type === 'json' || block.type === 'json-array') {
      rawContent = JSON.stringify(block.content, null, 2);
    } else if (block.type === 'xml' || block.type === 'xml-array') {
      rawContent = typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2);
    } else {
      rawContent = typeof block.content === 'object' && block.content !== null ? JSON.stringify(block.content, null, 2) : String(block.content);
    }

    if (!rawContent) return [];

    const page = block.metadata?.page !== undefined ? Number(block.metadata.page) : undefined;

    return [
      {
        content: rawContent,
        contentType: 'STRUCTURED_DATA',
        pageStart: page,
        pageEnd: page,
        metadata: {
          sourceType: context.sourceType,
          ...block.metadata,
        },
      },
    ];
  }
}
export default StructuredDataChunkStrategy;

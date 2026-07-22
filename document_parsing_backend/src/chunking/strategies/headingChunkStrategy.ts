import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class HeadingChunkStrategy implements ChunkStrategy {
  /**
   * Translates heading content block into raw header chunk.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[] {
    const page = block.metadata?.page !== undefined ? Number(block.metadata.page) : undefined;

    return [
      {
        content: String(block.content).trim(),
        contentType: 'HEADING',
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
export default HeadingChunkStrategy;

import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class ParagraphChunkStrategy implements ChunkStrategy {
  /**
   * Decomposes paragraphs or lists into raw text chunks.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[] {
    let textContent = '';
    const page = block.metadata?.page !== undefined ? Number(block.metadata.page) : undefined;

    if (block.type === 'list') {
      if (Array.isArray(block.content)) {
        textContent = block.content.map(item => `- ${String(item).trim()}`).join('\n');
      } else {
        textContent = `- ${String(block.content).trim()}`;
      }
    } else {
      textContent = String(block.content).trim();
    }

    if (textContent === '') {
      return [];
    }

    return [
      {
        content: textContent,
        contentType: 'TEXT',
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
export default ParagraphChunkStrategy;

import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class PresentationChunkStrategy implements ChunkStrategy {
  /**
   * Conforms slide metadata blocks and speaker notes into raw presentation slide chunks.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext & { notes?: string }): RawChunk[] {
    const slide = block.content || {};
    const slideNum = slide.slideNumber || 0;
    const title = slide.title || 'Slide';
    const slideText = slide.content || '';
    const notes = context.notes || '';

    let textContent = `Slide ${slideNum}: ${title}\n---\n${slideText}`;
    if (notes.trim() !== '') {
      textContent += `\n\nPresenter Notes:\n${notes}`;
    }

    return [
      {
        content: textContent.trim(),
        contentType: 'PRESENTATION',
        slideNumber: slideNum,
        metadata: {
          sourceType: context.sourceType,
          slideNumber: slideNum,
          title,
          notes: notes !== '' ? notes : undefined,
        },
      },
    ];
  }
}
export default PresentationChunkStrategy;

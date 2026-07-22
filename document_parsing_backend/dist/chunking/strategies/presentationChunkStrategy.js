"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentationChunkStrategy = void 0;
class PresentationChunkStrategy {
    /**
     * Conforms slide metadata blocks and speaker notes into raw presentation slide chunks.
     */
    chunk(block, context) {
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
exports.PresentationChunkStrategy = PresentationChunkStrategy;
exports.default = PresentationChunkStrategy;

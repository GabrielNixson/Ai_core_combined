"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentationNormalizer = void 0;
class PresentationNormalizer {
    /**
     * Transforms raw PPTX parsed slides into flat DocumentSection list.
     */
    static normalizeSlides(slides) {
        const sections = [];
        for (const slide of slides) {
            const contentBlocks = [];
            // 1. Accumulate slide text for the metadata block
            const textParts = [];
            for (const el of slide.elements) {
                if (el.type === 'heading') {
                    contentBlocks.push({
                        type: 'heading',
                        content: el.content,
                    });
                    textParts.push(el.content);
                }
                else if (el.type === 'paragraph') {
                    contentBlocks.push({
                        type: 'paragraph',
                        content: el.content,
                    });
                    textParts.push(el.content);
                }
                else if (el.type === 'list') {
                    contentBlocks.push({
                        type: 'list',
                        content: el.content, // string[]
                    });
                    textParts.push(...el.content);
                }
                else if (el.type === 'table') {
                    contentBlocks.push({
                        type: 'table',
                        content: el.content, // TableContent
                    });
                    // For text concatenation, serialize tables as simple row text runs
                    const table = el.content;
                    if (table.columns)
                        textParts.push(table.columns.join(' | '));
                    if (table.rows) {
                        table.rows.forEach((row) => textParts.push(row.join(' | ')));
                    }
                }
            }
            // 2. Add slide notes block if available
            if (slide.notes && slide.notes.trim() !== '') {
                contentBlocks.push({
                    type: 'notes',
                    content: slide.notes,
                });
            }
            // 3. Add Slide metadata block (as required by specification)
            const slideContent = textParts.join('\n').trim();
            contentBlocks.push({
                type: 'slide',
                content: {
                    slideNumber: slide.slideNumber,
                    title: slide.title,
                    content: slideContent,
                },
            });
            // Map to DocumentSection
            sections.push({
                title: `Slide ${slide.slideNumber} - ${slide.title}`,
                level: 1,
                content: contentBlocks,
            });
        }
        return sections;
    }
}
exports.PresentationNormalizer = PresentationNormalizer;
exports.default = PresentationNormalizer;

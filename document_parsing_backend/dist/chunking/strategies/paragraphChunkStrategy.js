"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParagraphChunkStrategy = void 0;
class ParagraphChunkStrategy {
    /**
     * Decomposes paragraphs or lists into raw text chunks.
     */
    chunk(block, context) {
        let textContent = '';
        const page = block.metadata?.page !== undefined ? Number(block.metadata.page) : undefined;
        if (block.type === 'list') {
            if (Array.isArray(block.content)) {
                textContent = block.content.map(item => `- ${String(item).trim()}`).join('\n');
            }
            else {
                textContent = `- ${String(block.content).trim()}`;
            }
        }
        else {
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
exports.ParagraphChunkStrategy = ParagraphChunkStrategy;
exports.default = ParagraphChunkStrategy;

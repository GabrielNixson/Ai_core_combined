"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadingChunkStrategy = void 0;
class HeadingChunkStrategy {
    /**
     * Translates heading content block into raw header chunk.
     */
    chunk(block, context) {
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
exports.HeadingChunkStrategy = HeadingChunkStrategy;
exports.default = HeadingChunkStrategy;

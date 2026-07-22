"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredDataChunkStrategy = void 0;
class StructuredDataChunkStrategy {
    /**
     * Transforms structured documents (JSON or XML) into raw structured data chunks.
     */
    chunk(block, context) {
        let rawContent = '';
        if (block.type === 'json' || block.type === 'json-array') {
            rawContent = JSON.stringify(block.content, null, 2);
        }
        else if (block.type === 'xml' || block.type === 'xml-array') {
            rawContent = typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2);
        }
        else {
            rawContent = typeof block.content === 'object' && block.content !== null ? JSON.stringify(block.content, null, 2) : String(block.content);
        }
        if (!rawContent)
            return [];
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
exports.StructuredDataChunkStrategy = StructuredDataChunkStrategy;
exports.default = StructuredDataChunkStrategy;

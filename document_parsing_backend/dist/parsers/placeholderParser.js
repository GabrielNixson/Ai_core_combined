"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceholderParser = void 0;
class PlaceholderParser {
    supportedType;
    constructor(supportedType) {
        this.supportedType = supportedType;
    }
    /**
     * Checks if this parser supports the request's DocumentType.
     */
    supports(type) {
        return type === this.supportedType;
    }
    /**
     * Performs a mock parse, returning a structured ParsedDocument.
     */
    async parse(context) {
        return {
            documentId: context.documentId,
            documentType: context.documentType,
            metadata: {
                title: context.originalFileName,
                author: 'System Placeholder',
                createdAt: new Date(),
                updatedAt: new Date(),
                totalPages: 1,
            },
            sections: [
                {
                    title: 'Document Processing Details',
                    level: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: `This is placeholder parsed content for file "${context.originalFileName}" of type ${context.documentType}.`,
                        },
                    ],
                },
            ],
        };
    }
}
exports.PlaceholderParser = PlaceholderParser;
exports.default = PlaceholderParser;

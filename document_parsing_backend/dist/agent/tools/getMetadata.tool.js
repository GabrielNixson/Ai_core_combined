"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMetadataTool = void 0;
const Document_1 = require("../../models/Document");
const documentChunk_1 = require("../../chunking/models/documentChunk");
const logger_1 = require("../../utils/logger");
class GetMetadataTool {
    name = 'getMetadata';
    description = 'Retrieves document details, metadata, or specific chunks. Inputs: action ("getDocumentMetadata" | "getDocumentById" | "getChunk"), documentId (optional string), chunkId (optional string).';
    async execute(input) {
        logger_1.logger.info(`[Get Metadata Tool] Action: ${input.action}`);
        if (input.action === 'getDocumentMetadata' || input.action === 'getDocumentById') {
            if (!input.documentId) {
                throw new Error('documentId is required for this action');
            }
            const doc = await Document_1.DocumentModel.findOne({ documentId: input.documentId }).lean();
            return doc || { error: 'Document not found' };
        }
        if (input.action === 'getChunk') {
            if (!input.chunkId) {
                throw new Error('chunkId is required for this action');
            }
            const chunk = await documentChunk_1.ChunkModel.findOne({ chunkId: input.chunkId }).lean();
            return chunk || { error: 'Chunk not found' };
        }
        throw new Error(`Unsupported action: ${input.action}`);
    }
}
exports.GetMetadataTool = GetMetadataTool;
exports.default = GetMetadataTool;

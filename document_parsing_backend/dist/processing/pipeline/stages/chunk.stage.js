"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkStage = void 0;
const chunkGeneration_service_1 = require("../../../chunking/services/chunkGeneration.service");
const chunkStorage_service_1 = require("../../../chunking/services/chunkStorage.service");
const documentStorage_service_1 = require("../../../services/documentStorage.service");
const Document_1 = require("../../../models/Document");
const logger_1 = require("../../../utils/logger");
class ChunkStage {
    name = 'ChunkStage';
    chunkService;
    chunkStorageService;
    documentStorageService;
    constructor(chunkService = new chunkGeneration_service_1.ChunkGenerationService(), chunkStorageService = new chunkStorage_service_1.ChunkStorageService(), documentStorageService = new documentStorage_service_1.DocumentStorageService()) {
        this.chunkService = chunkService;
        this.chunkStorageService = chunkStorageService;
        this.documentStorageService = documentStorageService;
    }
    /**
     * Executes chunking, link indices, persists batches, and updates database records.
     */
    async execute(context) {
        if (!context.parsedDocument) {
            logger_1.logger.warn(`[ChunkStage] No ParsedDocument found in context for document ID ${context.documentId}. Skipping chunking.`);
            return context;
        }
        const doc = await this.documentStorageService.getDocument(context.documentId);
        if (doc?.status === Document_1.DocumentStatus.CANCELLED) {
            throw new Error('Job cancelled by user');
        }
        await this.documentStorageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.CHUNKING, {
            progress: 75,
        });
        logger_1.logger.debug(`[ChunkStage] Generating chunks for document: ${context.documentId}`);
        const chunks = this.chunkService.generateChunks(context.parsedDocument);
        // Link sequential chunk IDs
        for (let i = 0; i < chunks.length; i++) {
            const current = chunks[i];
            if (!current)
                continue;
            if (i > 0) {
                const prev = chunks[i - 1];
                if (prev) {
                    current.previousChunkId = prev.chunkId;
                }
            }
            if (i < chunks.length - 1) {
                const next = chunks[i + 1];
                if (next) {
                    current.nextChunkId = next.chunkId;
                }
            }
        }
        await this.chunkStorageService.persistChunks(context.documentId, chunks);
        await this.documentStorageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.CHUNKED, {
            chunksCount: chunks.length,
            progress: 75,
        });
        return {
            ...context,
            chunks,
        };
    }
}
exports.ChunkStage = ChunkStage;
exports.default = ChunkStage;

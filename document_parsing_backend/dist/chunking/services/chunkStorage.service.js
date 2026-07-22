"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkStorageService = void 0;
const chunk_repository_1 = require("../repositories/chunk.repository");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class ChunkStorageService {
    chunkRepository;
    constructor(chunkRepository = new chunk_repository_1.ChunkRepository()) {
        this.chunkRepository = chunkRepository;
    }
    /**
     * Persists document chunks to MongoDB in batched writes matching batchInsertSize config.
     */
    async persistChunks(documentId, chunks) {
        if (chunks.length === 0)
            return [];
        logger_1.logger.debug(`[Chunk Storage] Saving ${chunks.length} chunks for document: ${documentId}`);
        // Pre-clear existing chunks to avoid duplicates
        await this.chunkRepository.deleteChunks(documentId);
        const batchSize = config_1.config.batchInsertSize || 100;
        const inserted = [];
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            logger_1.logger.debug(`[Chunk Storage] Batch inserting ${batch.length} chunks (offset: ${i})`);
            const res = await this.chunkRepository.createMany(batch);
            inserted.push(...res);
        }
        return inserted;
    }
    /**
     * Retrieves all chunks stored for a documentId.
     */
    async retrieveChunks(documentId) {
        return this.chunkRepository.findByDocument(documentId);
    }
    /**
     * Counts the chunks stored for a documentId.
     */
    async countChunks(documentId) {
        return this.chunkRepository.countChunks(documentId);
    }
    /**
     * Cleans up chunks stored for a documentId.
     */
    async deleteChunks(documentId) {
        return this.chunkRepository.deleteChunks(documentId);
    }
}
exports.ChunkStorageService = ChunkStorageService;
exports.default = ChunkStorageService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSyncService = void 0;
const vector_repository_1 = require("../repositories/vector.repository");
const chunk_repository_1 = require("../../chunking/repositories/chunk.repository");
const documentChunk_1 = require("../../chunking/models/documentChunk");
const vector_types_1 = require("../models/vector.types");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
class VectorSyncService {
    vectorRepository;
    chunkRepository;
    batchSize;
    constructor(vectorRepository = new vector_repository_1.VectorRepository(), chunkRepository = new chunk_repository_1.ChunkRepository()) {
        this.vectorRepository = vectorRepository;
        this.chunkRepository = chunkRepository;
        this.batchSize = config_1.config.qdrantBatchSize || 100;
    }
    /**
     * Synchronizes embeddings of document chunks into Qdrant.
     */
    async syncDocument(documentId, version) {
        logger_1.logger.info(`[Vector Sync Service] Starting vector sync for document: ${documentId}, version: ${version}`);
        // 1. Fetch chunks belonging to the document from MongoDB
        const chunks = await this.chunkRepository.findByDocument(documentId);
        // Filter out chunks that do not have embeddings
        const validChunks = chunks.filter(c => c.embedding && c.embedding.length > 0);
        if (validChunks.length === 0) {
            logger_1.logger.warn(`[Vector Sync Service] No chunks with valid embeddings found for document: ${documentId}`);
            return 0;
        }
        // 2. Ensure Qdrant collection exists matching the embedding dimensions
        const dimensions = validChunks[0]?.embedding?.length || config_1.config.vectorDimensions || 1536;
        await this.vectorRepository.ensureCollection(dimensions);
        // 3. Mark chunk sync statuses to SYNCING in MongoDB
        const chunkIds = validChunks.map(c => c.chunkId);
        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunkIds } }, { $set: { vectorSyncStatus: vector_types_1.VectorSyncStatus.SYNCING } });
        // 4. Batch upsert vectors into Qdrant
        let syncedCount = 0;
        for (let i = 0; i < validChunks.length; i += this.batchSize) {
            const batch = validChunks.slice(i, i + this.batchSize);
            const points = batch.map(chunk => {
                const pointId = (0, uuid_1.v5)(chunk.chunkId, NAMESPACE);
                return {
                    id: pointId,
                    vector: chunk.embedding || [],
                    payload: {
                        documentId: chunk.documentId,
                        chunkId: chunk.chunkId,
                        contentType: chunk.contentType,
                        title: chunk.title,
                        section: chunk.section || null,
                        sectionPath: chunk.sectionPath || null,
                        pageStart: chunk.pageStart || null,
                        pageEnd: chunk.pageEnd || null,
                        slideNumber: chunk.slideNumber || null,
                        processingVersion: version,
                        metadata: chunk.metadata || {},
                    }
                };
            });
            const start = Date.now();
            await this.vectorRepository.upsert(points);
            const latency = Date.now() - start;
            logger_1.logger.info(`[Vector Sync Service] Upserted batch of size ${batch.length} in ${latency}ms`);
            syncedCount += batch.length;
        }
        // 5. Update chunk statuses to SYNCED in MongoDB
        await documentChunk_1.ChunkModel.updateMany({ chunkId: { $in: chunkIds } }, {
            $set: {
                vectorSyncStatus: vector_types_1.VectorSyncStatus.SYNCED,
                vectorSyncedAt: new Date(),
            },
            $unset: {
                vectorSyncError: 1
            }
        });
        logger_1.logger.info(`[Vector Sync Service] Synchronized ${syncedCount} vectors successfully for document ${documentId}`);
        return syncedCount;
    }
    /**
     * Removes all document vectors from Qdrant and updates MongoDB status.
     */
    async deleteDocumentVectors(documentId) {
        logger_1.logger.info(`[Vector Sync Service] Deleting Qdrant vectors for document: ${documentId}`);
        await this.vectorRepository.deleteDocumentVectors(documentId);
        // Reset chunk sync statuses in MongoDB
        await documentChunk_1.ChunkModel.updateMany({ documentId }, {
            $set: {
                vectorSyncStatus: vector_types_1.VectorSyncStatus.PENDING
            },
            $unset: {
                vectorSyncedAt: 1,
                vectorSyncError: 1
            }
        });
    }
}
exports.VectorSyncService = VectorSyncService;
exports.default = VectorSyncService;

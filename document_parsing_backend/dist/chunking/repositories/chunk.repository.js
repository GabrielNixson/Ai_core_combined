"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkRepository = void 0;
const base_repository_1 = require("../../repositories/base.repository");
const documentChunk_1 = require("../models/documentChunk");
class ChunkRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(documentChunk_1.ChunkModel);
    }
    /**
     * Bulk inserts a list of document chunk objects, utilizing the session context if provided.
     */
    async createMany(chunks, session) {
        const docs = await documentChunk_1.ChunkModel.insertMany(chunks, { session });
        return docs.map(doc => doc.toObject());
    }
    /**
     * Bulk inserts a list of document chunk objects. Alias for createMany.
     */
    async insertMany(chunks, session) {
        return this.createMany(chunks, session);
    }
    /**
     * Retrieves all chunks belonging to a documentId.
     */
    async findByDocument(documentId, session) {
        return this.find({ documentId }, session);
    }
    /**
     * Looks up a specific chunk by its chunkId.
     */
    async findChunk(chunkId, session) {
        return this.findOne({ chunkId }, session);
    }
    /**
     * Deletes all chunks associated with a documentId.
     */
    async deleteChunks(documentId, session) {
        const result = await documentChunk_1.ChunkModel.deleteMany({ documentId }, { session }).exec();
        return (result.deletedCount ?? 0) > 0;
    }
    /**
     * Returns total chunk records matching a documentId.
     */
    async countChunks(documentId, session) {
        return documentChunk_1.ChunkModel.countDocuments({ documentId }).session(session || null).exec();
    }
}
exports.ChunkRepository = ChunkRepository;
exports.default = ChunkRepository;

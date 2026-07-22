"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorRepository = void 0;
const qdrantVector_provider_1 = require("../providers/qdrantVector.provider");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class VectorRepository {
    provider;
    collection;
    constructor(provider = new qdrantVector_provider_1.QdrantVectorProvider()) {
        this.provider = provider;
        this.collection = config_1.config.collectionName || 'documents';
    }
    async upsert(points) {
        await this.provider.upsertVectors(this.collection, points);
    }
    async deleteDocumentVectors(documentId) {
        await this.provider.deleteByFilter(this.collection, { documentId });
    }
    async deleteChunkVectors(chunkIds) {
        await this.provider.deleteVectors(this.collection, chunkIds);
    }
    async search(vector, limit = 10, filter) {
        return this.provider.search(this.collection, vector, limit, filter);
    }
    async searchByDocument(documentId, vector, limit = 10) {
        return this.provider.search(this.collection, vector, limit, { documentId });
    }
    async collectionInfo() {
        return this.provider.getCollectionInfo(this.collection);
    }
    async ensureCollection(dimensions) {
        const exists = await this.provider.collectionExists(this.collection);
        if (!exists) {
            logger_1.logger.info(`[Vector Repository] Collection '${this.collection}' does not exist. Creating it.`);
            await this.provider.createCollection(this.collection, dimensions, config_1.config.distanceMetric || 'Cosine');
        }
    }
}
exports.VectorRepository = VectorRepository;
exports.default = VectorRepository;

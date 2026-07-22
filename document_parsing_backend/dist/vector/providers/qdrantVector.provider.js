"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantVectorProvider = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class QdrantVectorProvider {
    client;
    isMock = false;
    mockStore = new Map();
    constructor() {
        const host = config_1.config.qdrantHost;
        if (!host || host.includes('mock') || host === 'http://localhost:6333' && process.env.NODE_ENV === 'test') {
            this.isMock = true;
            logger_1.logger.warn('[Qdrant Vector Provider] Running in MOCK mode with in-memory vector storage.');
        }
        this.client = new js_client_rest_1.QdrantClient({
            url: host || 'http://localhost:6333',
            apiKey: config_1.config.qdrantApiKey,
        });
    }
    async collectionExists(collectionName) {
        if (this.isMock) {
            return this.mockStore.has(collectionName);
        }
        try {
            const collections = await this.client.getCollections();
            return collections.collections.some((c) => c.name === collectionName);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to check collection existence: ${error.message || error}`);
            // Fallback to mock mode if connection refused during runtime testing
            if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'))) {
                logger_1.logger.warn('[Qdrant Provider] Connection refused. Falling back to MOCK mode.');
                this.isMock = true;
                return this.mockStore.has(collectionName);
            }
            return false;
        }
    }
    async createCollection(collectionName, dimensions, distanceMetric) {
        if (this.isMock) {
            if (!this.mockStore.has(collectionName)) {
                this.mockStore.set(collectionName, new Map());
            }
            logger_1.logger.info(`[Qdrant Provider] [Mock] Created collection '${collectionName}' with ${dimensions} dimensions.`);
            return;
        }
        try {
            const qMetric = (distanceMetric === 'Euclidean' ? 'Euclid' : distanceMetric);
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: dimensions,
                    distance: qMetric,
                },
            });
            logger_1.logger.info(`[Qdrant Provider] Created collection '${collectionName}' with ${dimensions} dimensions and ${distanceMetric} distance.`);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to create collection: ${error.message || error}`);
            throw error;
        }
    }
    async deleteCollection(collectionName) {
        if (this.isMock) {
            this.mockStore.delete(collectionName);
            logger_1.logger.info(`[Qdrant Provider] [Mock] Deleted collection '${collectionName}'.`);
            return;
        }
        try {
            await this.client.deleteCollection(collectionName);
            logger_1.logger.info(`[Qdrant Provider] Deleted collection '${collectionName}'.`);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to delete collection: ${error.message || error}`);
            throw error;
        }
    }
    async upsertVectors(collectionName, points) {
        if (this.isMock) {
            let col = this.mockStore.get(collectionName);
            if (!col) {
                col = new Map();
                this.mockStore.set(collectionName, col);
            }
            for (const p of points) {
                col.set(p.id, { vector: p.vector, payload: p.payload });
            }
            logger_1.logger.info(`[Qdrant Provider] [Mock] Upserted ${points.length} vectors into '${collectionName}'.`);
            return;
        }
        try {
            const qPoints = points.map((p) => ({
                id: p.id,
                vector: p.vector,
                payload: p.payload,
            }));
            await this.client.upsert(collectionName, {
                wait: true,
                points: qPoints,
            });
            logger_1.logger.debug(`[Qdrant Provider] Upserted ${points.length} points to collection: ${collectionName}`);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to upsert vectors: ${error.message || error}`);
            throw error;
        }
    }
    async deleteVectors(collectionName, ids) {
        if (this.isMock) {
            const col = this.mockStore.get(collectionName);
            if (col) {
                for (const id of ids) {
                    col.delete(id);
                }
            }
            logger_1.logger.info(`[Qdrant Provider] [Mock] Deleted ${ids.length} vectors from '${collectionName}'.`);
            return;
        }
        try {
            await this.client.delete(collectionName, {
                points: ids,
            });
            logger_1.logger.debug(`[Qdrant Provider] Deleted ${ids.length} points from collection: ${collectionName}`);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to delete vectors: ${error.message || error}`);
            throw error;
        }
    }
    async deleteByFilter(collectionName, filter) {
        if (this.isMock) {
            const col = this.mockStore.get(collectionName);
            if (col) {
                for (const [id, data] of col.entries()) {
                    const match = Object.entries(filter).every(([key, value]) => data.payload[key] === value);
                    if (match) {
                        col.delete(id);
                    }
                }
            }
            logger_1.logger.info(`[Qdrant Provider] [Mock] Deleted vectors matching filter ${JSON.stringify(filter)}.`);
            return;
        }
        try {
            const qFilter = {
                must: Object.entries(filter).map(([key, value]) => ({
                    key: key,
                    match: {
                        value: value,
                    },
                })),
            };
            await this.client.delete(collectionName, {
                filter: qFilter,
            });
            logger_1.logger.debug(`[Qdrant Provider] Deleted points by filter from collection: ${collectionName}`);
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to delete by filter: ${error.message || error}`);
            throw error;
        }
    }
    async search(collectionName, vector, limit, filter) {
        if (this.isMock) {
            const col = this.mockStore.get(collectionName);
            if (!col)
                return [];
            let list = Array.from(col.entries()).map(([id, data]) => {
                let score = 0.95;
                if (data.vector.length === vector.length) {
                    let dotProduct = 0;
                    let normA = 0;
                    let normB = 0;
                    for (let i = 0; i < vector.length; i++) {
                        const vVal = vector[i];
                        const dVal = data.vector[i];
                        if (vVal !== undefined && dVal !== undefined) {
                            dotProduct += vVal * dVal;
                            normA += vVal * vVal;
                            normB += dVal * dVal;
                        }
                    }
                    score = normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
                }
                else {
                    score = Math.random();
                }
                return { id, score, payload: data.payload };
            });
            if (filter) {
                const activeFilters = Object.entries(filter).filter(([_, v]) => v !== undefined && v !== null);
                list = list.filter((item) => activeFilters.every(([key, val]) => item.payload[key] === val));
            }
            list.sort((a, b) => b.score - a.score);
            return list.slice(0, limit);
        }
        try {
            const activeFilters = Object.entries(filter || {}).filter(([_, v]) => v !== undefined && v !== null);
            const qFilter = activeFilters.length > 0
                ? {
                    must: activeFilters.map(([key, value]) => ({
                        key: key,
                        match: {
                            value: value,
                        },
                    })),
                }
                : undefined;
            const response = await this.client.search(collectionName, {
                vector: vector,
                limit: limit,
                filter: qFilter,
                with_payload: true,
            });
            return response.map((point) => ({
                id: point.id.toString(),
                score: point.score,
                payload: point.payload || {},
            }));
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Search failed: ${error.message || error}`);
            throw error;
        }
    }
    async getCollectionInfo(collectionName) {
        if (this.isMock) {
            const col = this.mockStore.get(collectionName);
            return {
                pointsCount: col ? col.size : 0,
                status: 'green',
            };
        }
        try {
            const response = await this.client.getCollection(collectionName);
            return {
                pointsCount: response.points_count || 0,
                status: response.status || 'unknown',
            };
        }
        catch (error) {
            logger_1.logger.error(`[Qdrant Provider] Failed to get collection info: ${error.message || error}`);
            throw error;
        }
    }
}
exports.QdrantVectorProvider = QdrantVectorProvider;
exports.default = QdrantVectorProvider;

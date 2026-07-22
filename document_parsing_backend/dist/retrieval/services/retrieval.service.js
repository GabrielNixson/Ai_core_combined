"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalService = exports.RetrievalMetricsTracker = void 0;
const vector_repository_1 = require("../../vector/repositories/vector.repository");
const documentChunk_1 = require("../../chunking/models/documentChunk");
const queryEmbedding_service_1 = require("./queryEmbedding.service");
const passthroughReranker_1 = require("../reranker/passthroughReranker");
const retrieval_cache_1 = require("../cache/retrieval.cache");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class RetrievalMetricsTracker {
    static instance;
    totalSearches = 0;
    totalSearchLatencyMs = 0;
    totalEmbeddingLatencyMs = 0;
    totalVectorSearchLatencyMs = 0;
    totalReturnedChunks = 0;
    sumScores = 0;
    numScores = 0;
    constructor() { }
    static getInstance() {
        if (!RetrievalMetricsTracker.instance) {
            RetrievalMetricsTracker.instance = new RetrievalMetricsTracker();
        }
        return RetrievalMetricsTracker.instance;
    }
    recordSearch(totalLatencyMs, embeddingLatencyMs, vectorSearchLatencyMs, returnedCount, avgScore) {
        this.totalSearches++;
        this.totalSearchLatencyMs += totalLatencyMs;
        this.totalEmbeddingLatencyMs += embeddingLatencyMs;
        this.totalVectorSearchLatencyMs += vectorSearchLatencyMs;
        this.totalReturnedChunks += returnedCount;
        if (returnedCount > 0) {
            this.sumScores += avgScore * returnedCount;
            this.numScores += returnedCount;
        }
    }
    getStats() {
        const cacheStats = retrieval_cache_1.RetrievalCache.getInstance().getStats();
        const avgScore = this.numScores > 0 ? this.sumScores / this.numScores : 0;
        const avgLatency = this.totalSearches > 0 ? this.totalSearchLatencyMs / this.totalSearches : 0;
        const avgEmbed = this.totalSearches > 0 ? this.totalEmbeddingLatencyMs / this.totalSearches : 0;
        const avgVector = this.totalSearches > 0 ? this.totalVectorSearchLatencyMs / this.totalSearches : 0;
        return {
            averageSearchLatencyMs: parseFloat(avgLatency.toFixed(2)),
            averageEmbeddingLatencyMs: parseFloat(avgEmbed.toFixed(2)),
            averageVectorSearchLatencyMs: parseFloat(avgVector.toFixed(2)),
            cacheHitRatio: cacheStats.hitRatio,
            averageScore: parseFloat(avgScore.toFixed(3)),
            totalReturnedChunks: this.totalReturnedChunks,
            totalSearches: this.totalSearches,
        };
    }
}
exports.RetrievalMetricsTracker = RetrievalMetricsTracker;
class RetrievalService {
    vectorRepository;
    queryEmbeddingService;
    reranker;
    cache;
    metrics;
    constructor(vectorRepository = new vector_repository_1.VectorRepository(), queryEmbeddingService = new queryEmbedding_service_1.QueryEmbeddingService(), reranker = new passthroughReranker_1.PassThroughReranker()) {
        this.vectorRepository = vectorRepository;
        this.queryEmbeddingService = queryEmbeddingService;
        this.reranker = reranker;
        this.cache = retrieval_cache_1.RetrievalCache.getInstance();
        this.metrics = RetrievalMetricsTracker.getInstance();
    }
    /**
     * Main retrieval method.
     */
    async retrieve(query, filters, options) {
        const startTime = Date.now();
        logger_1.logger.info(`[Retrieval Service] Search started for query: "${query.substring(0, 30)}..."`);
        // Parse configurations and defaults
        const topK = options?.topK || config_1.config.retrievalDefaultTopK;
        const minimumScore = options?.minimumScore || config_1.config.retrievalMinimumScore;
        const expandNeighbors = options?.expandNeighbors !== undefined
            ? options.expandNeighbors
            : config_1.config.retrievalEnableNeighborExpansion;
        const enableReranking = config_1.config.retrievalEnableReranking;
        // Check cache first
        const cached = await this.cache.getSearchResults(query, filters || {}, options || {});
        if (cached) {
            logger_1.logger.info('[Retrieval Service] Cache hit. Returning search results.');
            // Record cached search in metrics with 0 latency
            this.metrics.recordSearch(0, 0, 0, cached.length, this.calculateAvgScore(cached));
            return cached;
        }
        // Step 1: Generate query embedding
        const { vector: queryVector, latencyMs: embeddingLatency } = await this.queryEmbeddingService.generateEmbedding(query);
        // Step 2: Build database-level filters (skipping pageNumber for post-filtering range matches)
        const dbFilters = {};
        if (filters) {
            if (filters.documentId)
                dbFilters.documentId = filters.documentId;
            if (filters.documentType)
                dbFilters.documentType = filters.documentType;
            if (filters.section)
                dbFilters.section = filters.section;
            if (filters.contentType)
                dbFilters.contentType = filters.contentType;
            if (filters.processingVersion)
                dbFilters.processingVersion = filters.processingVersion;
            if (filters.slideNumber)
                dbFilters.slideNumber = filters.slideNumber;
            // Extract custom key-value pairs
            for (const [key, value] of Object.entries(filters)) {
                if (!['documentId', 'documentType', 'section', 'contentType', 'processingVersion', 'slideNumber', 'pageNumber'].includes(key)) {
                    dbFilters[key] = value;
                }
            }
        }
        // Step 3: Run Vector Similarity query (requesting topK * 3 candidate points to account for filter pruning)
        const vectorSearchStart = Date.now();
        const rawCandidates = await this.vectorRepository.search(queryVector, topK * 3, dbFilters);
        const vectorSearchLatency = Date.now() - vectorSearchStart;
        // Step 4: Apply score threshold
        const candidates = rawCandidates.filter(c => c.score >= minimumScore);
        if (candidates.length === 0) {
            logger_1.logger.info('[Retrieval Service] Search complete. 0 candidates matched score threshold.');
            const totalTime = Date.now() - startTime;
            this.metrics.recordSearch(totalTime, embeddingLatency, vectorSearchLatency, 0, 0);
            return [];
        }
        // Step 5: Load matching Document Chunks from MongoDB in one optimized bulk query
        const chunkIds = candidates.map(c => c.payload.chunkId || c.id);
        const chunkDocuments = await documentChunk_1.ChunkModel.find({ chunkId: { $in: chunkIds } }).lean();
        // Construct lookup map for O(1) correlation
        const chunkMap = new Map();
        for (const chunkDoc of chunkDocuments) {
            chunkMap.set(chunkDoc.chunkId, chunkDoc);
        }
        // Step 6: Map candidate points to RetrievalResult schemas
        let results = [];
        for (const candidate of candidates) {
            const cId = candidate.payload.chunkId || candidate.id;
            const chunk = chunkMap.get(cId);
            if (!chunk)
                continue; // Skip if chunk was removed in DB but remains indexed
            // Apply post-retrieval page number filter
            if (filters?.pageNumber !== undefined && filters.pageNumber !== null) {
                const pNum = filters.pageNumber;
                const pageStart = chunk.pageStart ?? -1;
                const pageEnd = chunk.pageEnd ?? -1;
                if (pageStart > pNum || pageEnd < pNum) {
                    continue; // Page number out of range, prune candidate
                }
            }
            const result = {
                documentId: chunk.documentId,
                chunkId: chunk.chunkId,
                content: chunk.content,
                score: candidate.score,
                title: chunk.title,
                section: chunk.section || null,
                pageStart: chunk.pageStart || null,
                pageEnd: chunk.pageEnd || null,
                slideNumber: chunk.slideNumber || null,
                metadata: chunk.metadata || {},
            };
            if (options?.includeSourceReference !== false) {
                result.sourceReference = this.buildSourceReference(result);
            }
            results.push(result);
        }
        // Step 7: Apply optional context neighbor expansion
        if (expandNeighbors && results.length > 0) {
            results = await this.expandNeighborContext(results);
        }
        // Step 8: Apply pluggable reranker
        let rerankingLatency = 0;
        if (enableReranking && results.length > 0) {
            const rerankStart = Date.now();
            results = await this.reranker.rerank(query, results);
            rerankingLatency = Date.now() - rerankStart;
        }
        // Step 9: Limit results to requested topK
        results = results.slice(0, topK);
        // Save to cache
        await this.cache.setSearchResults(query, filters || {}, options || {}, results);
        const totalResponseTime = Date.now() - startTime;
        logger_1.logger.info(`[Retrieval Service] Search complete. Returned ${results.length} chunks. Latency overview: total=${totalResponseTime}ms, embed=${embeddingLatency}ms, vector=${vectorSearchLatency}ms, rerank=${rerankingLatency}ms`);
        this.metrics.recordSearch(totalResponseTime, embeddingLatency, vectorSearchLatency, results.length, this.calculateAvgScore(results));
        return results;
    }
    /**
     * Constructs the reference citation text.
     */
    buildSourceReference(res) {
        const pageString = res.pageStart !== null
            ? res.pageEnd !== null && res.pageEnd !== res.pageStart
                ? `Pages ${res.pageStart}-${res.pageEnd}`
                : `Page ${res.pageStart}`
            : res.slideNumber !== null
                ? `Slide ${res.slideNumber}`
                : 'N/A';
        return `Document: ${res.title} | Section: ${res.section || 'General'} | Reference: ${pageString}`;
    }
    /**
     * Retrieves neighboring chunks and appends them to candidate results.
     */
    async expandNeighborContext(candidates) {
        // 1. Gather adjacent chunk ids to resolve in bulk
        const neighborIds = new Set();
        const chunkIds = candidates.map(c => c.chunkId);
        // We need to fetch the chunks again to inspect neighbor relationships
        const chunks = await documentChunk_1.ChunkModel.find({ chunkId: { $in: chunkIds } }).lean();
        const chunkDetailsMap = new Map();
        for (const c of chunks) {
            chunkDetailsMap.set(c.chunkId, c);
            if (c.previousChunkId)
                neighborIds.add(c.previousChunkId);
            if (c.nextChunkId)
                neighborIds.add(c.nextChunkId);
        }
        if (neighborIds.size === 0)
            return candidates;
        // 2. Fetch all neighbors in single bulk DB query
        const neighbors = await documentChunk_1.ChunkModel.find({ chunkId: { $in: Array.from(neighborIds) } }).lean();
        const neighborMap = new Map();
        for (const n of neighbors) {
            neighborMap.set(n.chunkId, n);
        }
        // 3. Re-inject context inside the results
        return candidates.map(result => {
            const originalChunk = chunkDetailsMap.get(result.chunkId);
            if (!originalChunk)
                return result;
            const prev = originalChunk.previousChunkId ? neighborMap.get(originalChunk.previousChunkId) : null;
            const next = originalChunk.nextChunkId ? neighborMap.get(originalChunk.nextChunkId) : null;
            let mergedContent = '';
            if (prev) {
                mergedContent += `[Preceding Context]\n${prev.content}\n\n`;
            }
            mergedContent += `[Matched Chunk]\n${result.content}`;
            if (next) {
                mergedContent += `\n\n[Succeeding Context]\n${next.content}`;
            }
            // Preserve original text inside metadata and update main content block
            const updatedMetadata = {
                ...result.metadata,
                originalContent: result.content,
                previousChunkId: originalChunk.previousChunkId || null,
                nextChunkId: originalChunk.nextChunkId || null,
            };
            return {
                ...result,
                content: mergedContent,
                metadata: updatedMetadata,
            };
        });
    }
    calculateAvgScore(results) {
        if (results.length === 0)
            return 0;
        const sum = results.reduce((acc, curr) => acc + curr.score, 0);
        return sum / results.length;
    }
}
exports.RetrievalService = RetrievalService;
exports.default = RetrievalService;

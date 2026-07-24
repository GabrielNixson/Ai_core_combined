"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
require("../utils/canvasMock");
const mongoose_1 = __importDefault(require("mongoose"));
const queryProcessor_service_1 = require("../rag/services/queryProcessor.service");
const tokenBudgetManager_service_1 = require("../rag/services/tokenBudgetManager.service");
const contextBuilder_service_1 = require("../rag/services/contextBuilder.service");
const promptBuilder_service_1 = require("../rag/services/promptBuilder.service");
const openai_provider_1 = require("../rag/providers/openai.provider");
const rag_service_1 = require("../rag/services/rag.service");
const retrieval_cache_1 = require("../retrieval/cache/retrieval.cache");
const documentChunk_1 = require("../chunking/models/documentChunk");
const Document_1 = require("../models/Document");
const retrieval_service_1 = require("../retrieval/services/retrieval.service");
const vector_repository_1 = require("../vector/repositories/vector.repository");
const qdrantVector_provider_1 = require("../vector/providers/qdrantVector.provider");
const queryEmbedding_service_1 = require("../retrieval/services/queryEmbedding.service");
const passthroughReranker_1 = require("../retrieval/reranker/passthroughReranker");
const config_1 = require("../config/config");
async function runTests() {
    let passed = 0;
    let failed = 0;
    const assert = (condition, message) => {
        if (condition) {
            console.log(`[PASS] - ${message}`);
            passed++;
        }
        else {
            console.error(`[FAIL] - ${message}`);
            failed++;
        }
    };
    console.log('=== STARTING RAG PIPELINE INTEGRATION TESTS ===\n');
    // --- Test 1: Query Processor ---
    console.log('Test 1: Query Processor Normalization');
    try {
        const qp = new queryProcessor_service_1.QueryProcessor();
        const clean = qp.processQuery('  \n  What is   the battery backup runtime?   \x07 ');
        assert(clean === 'What is the battery backup runtime?', 'Normalized multiple spaces and stripped control characters');
        let threwEmpty = false;
        try {
            qp.processQuery('    \n   ');
        }
        catch (_) {
            threwEmpty = true;
        }
        assert(threwEmpty, 'Threw error on whitespace-only queries');
        let threwShort = false;
        try {
            qp.processQuery('a');
        }
        catch (_) {
            threwShort = true;
        }
        assert(threwShort, 'Threw error on queries under 2 characters');
    }
    catch (err) {
        assert(false, `Test 1 failed: ${err}`);
    }
    // --- Test 2: Token Budget Manager ---
    console.log('\nTest 2: Token Budget Manager Heuristics');
    try {
        const tbm = new tokenBudgetManager_service_1.TokenBudgetManager();
        const estimate = tbm.estimateTokens('12345678'); // 8 chars / 4 = 2 tokens
        assert(estimate === 2, 'Token estimate is calculated as text length divided by 4');
        const dummyChunks = [
            { documentId: 'd1', chunkId: 'c1', content: 'Short chunk content', score: 0.9, title: 'Title', section: '', pageStart: 1, pageEnd: 1, slideNumber: null, metadata: {} },
            { documentId: 'd1', chunkId: 'c2', content: 'Extremely long chunk context content that exceeds budget boundaries', score: 0.8, title: 'Title', section: '', pageStart: 2, pageEnd: 2, slideNumber: null, metadata: {} },
        ];
        // Limit is 10 tokens. Chunk 1 is 19 chars -> 5 tokens. Chunk 2 is 67 chars -> 17 tokens.
        const budgeted = tbm.budgetContext(dummyChunks, 10);
        assert(budgeted.length === 1 && budgeted[0]?.chunkId === 'c1', 'Successfully dropped chunk that exceeded context token budget');
    }
    catch (err) {
        assert(false, `Test 2 failed: ${err}`);
    }
    // --- Test 3: Context Builder Reading Order ---
    console.log('\nTest 3: Context Builder logical reading order and deduplication');
    try {
        const cb = new contextBuilder_service_1.ContextBuilder();
        const unsorted = [
            { documentId: 'd1', chunkId: 'c-last-2', content: 'End paragraph.', score: 0.6, title: 'Operations Guide', section: 'Calibration', pageStart: 3, pageEnd: 3, slideNumber: null, metadata: {} },
            { documentId: 'd1', chunkId: 'c-first-0', content: 'Intro paragraph.', score: 0.9, title: 'Operations Guide', section: 'Administration', pageStart: 1, pageEnd: 1, slideNumber: null, metadata: {} },
            { documentId: 'd1', chunkId: 'c-first-0', content: 'Intro paragraph.', score: 0.9, title: 'Operations Guide', section: 'Administration', pageStart: 1, pageEnd: 1, slideNumber: null, metadata: {} }, // duplicate
            { documentId: 'd1', chunkId: 'c-middle-1', content: 'Body paragraph.', score: 0.8, title: 'Operations Guide', section: 'Calibration', pageStart: 2, pageEnd: 2, slideNumber: null, metadata: {} },
        ];
        const { contextText, deduplicated } = cb.buildContext(unsorted);
        assert(deduplicated.length === 3, 'Deduplicated candidates correctly');
        assert(deduplicated[0]?.chunkId === 'c-first-0', 'First sorted chunk matches introduction');
        assert(deduplicated[1]?.chunkId === 'c-middle-1', 'Second sorted chunk matches calibration start');
        assert(deduplicated[2]?.chunkId === 'c-last-2', 'Third sorted chunk matches calibration end');
        assert(contextText.includes('Document: "Operations Guide"'), 'Context has document headers');
        assert(contextText.includes('Section: "Administration"'), 'Context has section pathway headers');
    }
    catch (err) {
        assert(false, `Test 3 failed: ${err}`);
    }
    // --- Test 4: Prompt Builder templating ---
    console.log('\nTest 4: Prompt Builder replacement');
    try {
        const pb = new promptBuilder_service_1.PromptBuilder();
        const system = 'System directive';
        const context = 'Context contents';
        const query = 'User prompt question';
        const prompt = pb.buildPrompt(system, context, query);
        assert(prompt.includes(system) && prompt.includes(context) && prompt.includes(query), 'Assembled prompt contains all dynamic values');
    }
    catch (err) {
        assert(false, `Test 4 failed: ${err}`);
    }
    // --- Test 5: OpenAIProvider Mock fallback ---
    console.log('\nTest 5: LLM Provider Abstraction & Mock Response');
    try {
        const provider = new openai_provider_1.OpenAIProvider();
        const response = await provider.generateResponse('Test prompt');
        assert(response.answer.includes('[Mock Answer]'), 'Provider returned simulated mock response');
        assert(response.tokenUsage.promptTokens > 0, 'Returned estimated prompt tokens');
        assert(response.tokenUsage.completionTokens === 30, 'Returned default mock completion tokens count');
    }
    catch (err) {
        assert(false, `Test 5 failed: ${err}`);
    }
    // --- Test 6: End to End RAG Service ---
    console.log('\nTest 6: End-to-End RAG Service Execution');
    const testDocId = 'rag-test-doc-999';
    try {
        await mongoose_1.default.connect(config_1.config.mongoUri);
        const cache = retrieval_cache_1.RetrievalCache.getInstance();
        await cache.flushAll();
        // Clean any old records
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        // 1. Create document
        await Document_1.DocumentModel.create({
            documentId: testDocId,
            originalName: 'tech_specs.txt',
            storedName: 'tech_specs_999.txt',
            filePath: 'uploads/tech_specs.txt',
            mimeType: 'text/plain',
            extension: 'txt',
            size: 300,
            status: 'INDEXED',
            processingVersion: 1,
        });
        // 2. Create chunks
        await documentChunk_1.ChunkModel.create([
            {
                chunkId: 'chunk-tech-0',
                documentId: testDocId,
                chunkIndex: 0,
                content: 'Model X supports up to 64GB RAM storage.',
                contentType: 'TEXT',
                title: 'Technical Specification',
                tokenEstimate: 10,
                characterCount: 40,
                embedding: Array(1536).fill(0.9),
                embeddingStatus: 'COMPLETED',
                embeddingDimensions: 1536,
                vectorSyncStatus: 'SYNCED',
                pageStart: 1,
                pageEnd: 1,
                createdAt: new Date(),
            },
        ]);
        // 3. Vector Repository Setup
        const qProvider = new qdrantVector_provider_1.QdrantVectorProvider();
        const vectorRepo = new vector_repository_1.VectorRepository(qProvider);
        await vectorRepo.ensureCollection(1536);
        await vectorRepo.upsert([
            {
                id: 'uuid-tech-0',
                vector: Array(1536).fill(0.9),
                payload: { documentId: testDocId, chunkId: 'chunk-tech-0', title: 'Technical Specification', processingVersion: 1, pageStart: 1 }
            },
        ]);
        // Instantiate RetrievalService
        const mockEmbed = new queryEmbedding_service_1.QueryEmbeddingService();
        mockEmbed.generateEmbedding = async () => ({ vector: Array(1536).fill(0.9), latencyMs: 1 });
        const retrievalService = new retrieval_service_1.RetrievalService(vectorRepo, mockEmbed, new passthroughReranker_1.PassThroughReranker());
        // Instantiate RAGService
        const ragService = new rag_service_1.RAGService(retrievalService, new openai_provider_1.OpenAIProvider());
        // 4. Generate answer (cache miss)
        const ragResponse1 = await ragService.generateAnswer('How much RAM is supported?', { documentId: testDocId });
        assert(ragResponse1.answer.includes('[Mock Answer]'), 'RAG answered query using context');
        assert(ragResponse1.sources.length === 1 && ragResponse1.sources[0]?.chunkId === 'chunk-tech-0', 'Correctly resolved source attribution list');
        assert(ragResponse1.retrievedChunks.length === 1, 'Includes details of retrieved vector chunks');
        assert(ragResponse1.processingTime > 0, 'Tracks pipeline execution latency');
        // 5. Generate answer (cache hit)
        const ragResponse2 = await ragService.generateAnswer('How much RAM is supported?', { documentId: testDocId });
        assert(ragResponse2.answer.includes('[Mock Answer]'), 'Cached query returned correct answer');
        assert(ragResponse2.processingTime <= 10, 'Cached execution completed with minimal cache lookup delay');
        // 6. Verify cache metrics
        const tracker = rag_service_1.RAGMetricsTracker.getInstance();
        const stats = tracker.getStats();
        assert(stats.totalQueries === 2, 'Recorded exactly 2 RAG queries');
        assert(stats.cacheHitRatio === 0.33, 'Cache hit ratio mapped as 0.33 (33%)');
        // Clean up
        await qProvider.deleteCollection(vectorRepo.collection);
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        assert(false, `Test 6 failed: ${err}`);
        try {
            await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
            await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
            await mongoose_1.default.disconnect();
        }
        catch (_) { }
    }
    console.log('\n=== RAG PIPELINE INTEGRATION TESTS SUMMARY ===');
    console.log(`Passed: ${passed}/${passed + failed}`);
    console.log(`Failed: ${failed}/${passed + failed}`);
    if (failed > 0) {
        process.exit(1);
    }
    else {
        process.exit(0);
    }
}
runTests();

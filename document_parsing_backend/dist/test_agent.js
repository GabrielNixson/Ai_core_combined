"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
require("./utils/canvasMock");
const mongoose_1 = __importDefault(require("mongoose"));
const graph_1 = require("./agent/graph/graph");
const inMemory_provider_1 = require("./agent/memory/inMemory.provider");
const Document_1 = require("./models/Document");
const documentChunk_1 = require("./chunking/models/documentChunk");
const qdrantVector_provider_1 = require("./vector/providers/qdrantVector.provider");
const vector_repository_1 = require("./vector/repositories/vector.repository");
const config_1 = require("./config/config");
const askRAG_tool_1 = require("./agent/tools/askRAG.tool");
const retrieval_service_1 = require("./retrieval/services/retrieval.service");
const passthroughReranker_1 = require("./retrieval/reranker/passthroughReranker");
const queryEmbedding_service_1 = require("./retrieval/services/queryEmbedding.service");
const retrieval_cache_1 = require("./retrieval/cache/retrieval.cache");
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
    console.log('=== STARTING LANGGRAPH ORCHESTRATION LAYER TESTS ===\n');
    const testConvId = 'agent-thread-101';
    const testDocId = 'agent-doc-202';
    try {
        await mongoose_1.default.connect(config_1.config.mongoUri);
        const memory = inMemory_provider_1.InMemoryMemoryProvider.getInstance();
        await memory.clear(testConvId);
        // Prepare database document entities
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        await Document_1.DocumentModel.create({
            documentId: testDocId,
            originalName: 'system_manual.txt',
            storedName: 'system_manual_202.txt',
            filePath: 'uploads/system_manual.txt',
            mimeType: 'text/plain',
            extension: 'txt',
            size: 500,
            status: 'INDEXED',
            processingVersion: 1,
        });
        await documentChunk_1.ChunkModel.create([
            {
                chunkId: 'chunk-sys-0',
                documentId: testDocId,
                chunkIndex: 0,
                content: 'System error code 55 specifies water sensor alarm.',
                contentType: 'TEXT',
                title: 'System Manual',
                tokenEstimate: 10,
                characterCount: 40,
                embedding: Array(1536).fill(0.1),
                embeddingStatus: 'COMPLETED',
                embeddingDimensions: 1536,
                vectorSyncStatus: 'SYNCED',
                pageStart: 2,
                pageEnd: 2,
                createdAt: new Date(),
            },
        ]);
        const qProvider = new qdrantVector_provider_1.QdrantVectorProvider();
        const vectorRepo = new vector_repository_1.VectorRepository(qProvider);
        await vectorRepo.ensureCollection(1536);
        await vectorRepo.upsert([
            {
                id: 'uuid-sys-0',
                vector: Array(1536).fill(0.1),
                payload: { documentId: testDocId, chunkId: 'chunk-sys-0', title: 'System Manual', processingVersion: 1, pageStart: 2 }
            },
        ]);
        // Setup prototype patch for AskRAGTool.prototype.execute inside tests
        const mockEmbed = new queryEmbedding_service_1.QueryEmbeddingService();
        mockEmbed.generateEmbedding = async () => ({ vector: Array(1536).fill(0.1), latencyMs: 1 });
        const localRetrievalService = new retrieval_service_1.RetrievalService(vectorRepo, mockEmbed, new passthroughReranker_1.PassThroughReranker());
        askRAG_tool_1.AskRAGTool.prototype.execute = async function (input) {
            const filters = {};
            if (input.documentId)
                filters.documentId = input.documentId;
            const chunks = await localRetrievalService.retrieve(input.query, filters);
            return {
                answer: '[Mock Answer] Resolved query using context.',
                sources: chunks.map(c => ({
                    documentId: c.documentId,
                    chunkId: c.chunkId,
                    title: c.title,
                    section: c.section || null,
                    pageStart: c.pageStart || null,
                    pageEnd: c.pageEnd || null,
                    slideNumber: c.slideNumber || null,
                })),
                retrievedChunks: chunks,
            };
        };
        // --- Test 1: General Chat Intent Routing ---
        console.log('Test 1: General Chat Intent & Direct Answering');
        const threadConfig = { configurable: { thread_id: testConvId } };
        const state1 = await graph_1.agentGraph.invoke({
            conversationId: testConvId,
            userId: 'test-user',
            currentQuery: 'hello assistant, nice to meet you',
        }, threadConfig);
        assert(state1.intent === 'General Chat', 'Correctly classified general greeting intent');
        assert(state1.llmResponse.includes('[Mock Answer]'), 'Direct LLM answer generated');
        assert(state1.toolResults.length === 0, 'No tools executed for general chat');
        // --- Test 2: Conversational Memory Accumulation ---
        console.log('\nTest 2: Conversational Memory Persistence');
        const messages = await memory.getMessages(testConvId);
        assert(messages.length === 2, 'Memory recorded two message instances (User query & Assistant response)');
        assert(messages[0]?.role === 'user' && messages[1]?.role === 'assistant', 'Saved user and assistant role messages correctly');
        // --- Test 3: Metadata Query Intent and Execution ---
        console.log('\nTest 3: Metadata Request Intent and Metadata Tool Execution');
        const state2 = await graph_1.agentGraph.invoke({
            conversationId: testConvId,
            userId: 'test-user',
            currentQuery: 'give me metadata properties details for document',
            metadata: { documentId: testDocId, action: 'getDocumentMetadata' },
        }, threadConfig);
        assert(state2.intent === 'Metadata Request', 'Correctly classified metadata request intent');
        const metaRes = state2.toolResults.find(r => r.tool === 'getMetadata');
        assert(metaRes && metaRes.output && metaRes.output.documentId === testDocId, 'Executed getMetadata tool successfully');
        assert(state2.llmResponse.includes('[Mock Answer]'), 'LLM formatted metadata answer successfully');
        // --- Test 4: Checkpointing and Thread Continuation ---
        console.log('\nTest 4: Checkpoint Thread State Inspection');
        const checkpoints = await graph_1.agentGraph.getState(threadConfig);
        assert(checkpoints.values && checkpoints.values.conversationId === testConvId, 'State values persisted inside checkpointer');
        assert(checkpoints.values.intent === 'Metadata Request', 'Correct checkpoint state state values returned');
        // --- Test 5: askRAG Search Execution ---
        console.log('\nTest 5: RAG Query execution and Source Citation mapping');
        const state3 = await graph_1.agentGraph.invoke({
            conversationId: testConvId,
            userId: 'test-user',
            currentQuery: 'what is error code 55?',
            metadata: { documentId: testDocId },
        }, threadConfig);
        assert(state3.intent === 'Question Answering', 'Correctly classified QA query intent');
        const ragRes = state3.toolResults.find(r => r.tool === 'askRAG');
        assert(ragRes && ragRes.output && ragRes.output.answer, 'Executed askRAG tool successfully');
        assert(state3.sources.length === 1 && state3.sources[0]?.chunkId === 'chunk-sys-0', 'Sources mapped from retrieved RAG context');
        // Cleanup
        await qProvider.deleteCollection(vectorRepo.collection);
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        await mongoose_1.default.disconnect();
        await retrieval_cache_1.RetrievalCache.getInstance().disconnect();
    }
    catch (err) {
        assert(false, `Tests encountered error: ${err}`);
        try {
            await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
            await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
            await mongoose_1.default.disconnect();
            await retrieval_cache_1.RetrievalCache.getInstance().disconnect();
        }
        catch (_) { }
    }
    console.log('\n=== LANGGRAPH ORCHESTRATION TESTS SUMMARY ===');
    console.log(`Passed: ${passed}/${passed + failed}`);
    console.log(`Failed: ${failed}/${passed + failed}`);
    if (failed > 0) {
        process.exit(1);
    }
}
runTests();

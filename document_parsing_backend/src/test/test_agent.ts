process.env.NODE_ENV = 'test';
import '../utils/canvasMock';
import mongoose from 'mongoose';
import { agentGraph } from '../agent/graph/graph';
import { InMemoryMemoryProvider } from '../agent/memory/inMemory.provider';
import { DocumentModel } from '../models/Document';
import { ChunkModel } from '../chunking/models/documentChunk';
import { QdrantVectorProvider } from '../vector/providers/qdrantVector.provider';
import { VectorRepository } from '../vector/repositories/vector.repository';
import { config } from '../config/config';
import { AskRAGTool } from '../agent/tools/askRAG.tool';
import { RetrievalService } from '../retrieval/services/retrieval.service';
import { PassThroughReranker } from '../retrieval/reranker/passthroughReranker';
import { QueryEmbeddingService } from '../retrieval/services/queryEmbedding.service';
import { RetrievalCache } from '../retrieval/cache/retrieval.cache';

async function runTests() {
  let passed = 0;
  let failed = 0;

  const assert = (condition: any, message: string) => {
    if (condition) {
      console.log(`[PASS] - ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] - ${message}`);
      failed++;
    }
  };

  console.log('=== STARTING LANGGRAPH ORCHESTRATION LAYER TESTS ===\n');

  const testConvId = 'agent-thread-101';
  const testDocId = 'agent-doc-202';

  try {
    await mongoose.connect(config.mongoUri);
    const memory = InMemoryMemoryProvider.getInstance();
    await memory.clear(testConvId);

    // Prepare database document entities
    await DocumentModel.deleteOne({ documentId: testDocId });
    await ChunkModel.deleteMany({ documentId: testDocId });

    await DocumentModel.create({
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

    await ChunkModel.create([
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

    const qProvider = new QdrantVectorProvider();
    const vectorRepo = new VectorRepository(qProvider);
    await vectorRepo.ensureCollection(1536);
    await vectorRepo.upsert([
      {
        id: 'uuid-sys-0',
        vector: Array(1536).fill(0.1),
        payload: { documentId: testDocId, chunkId: 'chunk-sys-0', title: 'System Manual', processingVersion: 1, pageStart: 2 }
      },
    ]);

    // Setup prototype patch for AskRAGTool.prototype.execute inside tests
    const mockEmbed = new QueryEmbeddingService();
    mockEmbed.generateEmbedding = async () => ({ vector: Array(1536).fill(0.1), latencyMs: 1 });
    const localRetrievalService = new RetrievalService(vectorRepo, mockEmbed, new PassThroughReranker());

    AskRAGTool.prototype.execute = async function (input: { query: string; documentId?: string }) {
      const filters: Record<string, any> = {};
      if (input.documentId) filters.documentId = input.documentId;
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

    const state1 = await agentGraph.invoke({
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
    const state2 = await agentGraph.invoke({
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
    const checkpoints = await agentGraph.getState(threadConfig);
    assert(checkpoints.values && checkpoints.values.conversationId === testConvId, 'State values persisted inside checkpointer');
    assert(checkpoints.values.intent === 'Metadata Request', 'Correct checkpoint state state values returned');

    // --- Test 5: askRAG Search Execution ---
    console.log('\nTest 5: RAG Query execution and Source Citation mapping');
    const state3 = await agentGraph.invoke({
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
    await qProvider.deleteCollection((vectorRepo as any).collection);
    await DocumentModel.deleteOne({ documentId: testDocId });
    await ChunkModel.deleteMany({ documentId: testDocId });
    await mongoose.disconnect();
    await RetrievalCache.getInstance().disconnect();
  } catch (err) {
    assert(false, `Tests encountered error: ${err}`);
    try {
      await DocumentModel.deleteOne({ documentId: testDocId });
      await ChunkModel.deleteMany({ documentId: testDocId });
      await mongoose.disconnect();
      await RetrievalCache.getInstance().disconnect();
    } catch (_) { }
  }

  console.log('\n=== LANGGRAPH ORCHESTRATION TESTS SUMMARY ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

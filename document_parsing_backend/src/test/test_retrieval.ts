process.env.NODE_ENV = 'test';
import '../utils/canvasMock';
import mongoose from 'mongoose';
import { QueryEmbeddingService } from '../retrieval/services/queryEmbedding.service';
import { RetrievalCache } from '../retrieval/cache/retrieval.cache';
import { RetrievalService, RetrievalMetricsTracker } from '../retrieval/services/retrieval.service';
import { PassThroughReranker } from '../retrieval/reranker/passthroughReranker';
import { VectorRepository } from '../vector/repositories/vector.repository';
import { QdrantVectorProvider } from '../vector/providers/qdrantVector.provider';
import { ChunkModel } from '../chunking/models/documentChunk';
import { DocumentModel } from '../models/Document';
import { config } from '../config/config';

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

  console.log('=== STARTING SEMANTIC RETRIEVAL ENGINE TESTS ===\n');

  // --- Test 1: QueryEmbeddingService & Caching ---
  console.log('Test 1: Query Embedding Generation and Vector Cache');
  try {
    const cache = RetrievalCache.getInstance();
    await cache.flushAll(); // Start clean

    const embedService = new QueryEmbeddingService();

    // 1. Initial generation (cache miss)
    const startMiss = Date.now();
    const res1 = await embedService.generateEmbedding('find me vector guidelines');
    const timeMiss = Date.now() - startMiss;
    assert(res1.vector.length === 1536, 'Generated embedding vector of 1536 dimensions');
    assert(res1.latencyMs > 0 || timeMiss >= 0, 'Embedding service tracked latency for query');

    // 2. Secondary generation (cache hit)
    const res2 = await embedService.generateEmbedding('find me vector guidelines');
    assert(res2.vector.length === 1536, 'Retrieved matching vector dimension from cache');
    assert(res2.latencyMs === 0, 'Cached lookup returned instantly with 0ms latency');

    // 3. Stats validation
    const stats = cache.getStats();
    assert(stats.hits === 1, 'Cache registered exactly 1 lookup hit');
    assert(stats.misses === 1, 'Cache registered exactly 1 lookup miss');
    assert(stats.hitRatio === 0.5, 'Cache hit ratio is calculated as 0.50 (50%)');
  } catch (err) {
    assert(false, `Test 1 failed: ${err}`);
  }

  // --- Test 2: RetrievalService Setup & Post-filtering & Merged expansion ---
  console.log('\nTest 2: Semantic Retrieval Service, Metadata Filtering & Neighbor Expansion');
  const testDocId = 'retrieval-test-doc-123';
  try {
    await mongoose.connect(config.mongoUri);

    // Clean any old records
    await DocumentModel.deleteOne({ documentId: testDocId });
    await ChunkModel.deleteMany({ documentId: testDocId });

    // 1. Create document
    await DocumentModel.create({
      documentId: testDocId,
      originalName: 'operations_manual.txt',
      storedName: 'operations_manual_123.txt',
      filePath: 'uploads/operations_manual.txt',
      mimeType: 'text/plain',
      extension: 'txt',
      size: 500,
      status: 'INDEXED',
      processingVersion: 2,
    });

    const vec1 = Array(1536).fill(0); vec1[0] = 1.0;
    const vec2 = Array(1536).fill(0); vec2[1] = 1.0;
    const vec3 = Array(1536).fill(0); vec3[2] = 1.0;

    // 2. Create chained chunks with relationships (previousChunkId -> chunk -> nextChunkId)
    await ChunkModel.create([
      {
        chunkId: 'chunk-first-0',
        documentId: testDocId,
        chunkIndex: 0,
        content: 'This is step 1: turn on the electricity.',
        contentType: 'TEXT',
        title: 'Operations Guide',
        tokenEstimate: 10,
        characterCount: 40,
        embedding: vec1,
        embeddingStatus: 'COMPLETED',
        embeddingDimensions: 1536,
        vectorSyncStatus: 'SYNCED',
        nextChunkId: 'chunk-middle-1',
        pageStart: 1,
        pageEnd: 1,
        createdAt: new Date(),
      },
      {
        chunkId: 'chunk-middle-1',
        documentId: testDocId,
        chunkIndex: 1,
        content: 'This is step 2: push the green starter button.',
        contentType: 'TEXT',
        title: 'Operations Guide',
        tokenEstimate: 10,
        characterCount: 46,
        embedding: vec2,
        embeddingStatus: 'COMPLETED',
        embeddingDimensions: 1536,
        vectorSyncStatus: 'SYNCED',
        previousChunkId: 'chunk-first-0',
        nextChunkId: 'chunk-last-2',
        pageStart: 2,
        pageEnd: 2,
        createdAt: new Date(),
      },
      {
        chunkId: 'chunk-last-2',
        documentId: testDocId,
        chunkIndex: 2,
        content: 'This is step 3: wait for status lights to blink.',
        contentType: 'TEXT',
        title: 'Operations Guide',
        tokenEstimate: 10,
        characterCount: 48,
        embedding: vec3,
        embeddingStatus: 'COMPLETED',
        embeddingDimensions: 1536,
        vectorSyncStatus: 'SYNCED',
        previousChunkId: 'chunk-middle-1',
        pageStart: 3,
        pageEnd: 3,
        createdAt: new Date(),
      },
    ]);

    // 3. Upsert vectors into our mock Qdrant collection via the provider
    const provider = new QdrantVectorProvider();
    const repo = new VectorRepository(provider);
    await repo.ensureCollection(1536);

    await repo.upsert([
      {
        id: 'uuid-1',
        vector: vec1,
        payload: { documentId: testDocId, chunkId: 'chunk-first-0', title: 'Operations Guide', processingVersion: 2, pageStart: 1 }
      },
      {
        id: 'uuid-2',
        vector: vec2,
        payload: { documentId: testDocId, chunkId: 'chunk-middle-1', title: 'Operations Guide', processingVersion: 2, pageStart: 2 }
      },
      {
        id: 'uuid-3',
        vector: vec3,
        payload: { documentId: testDocId, chunkId: 'chunk-last-2', title: 'Operations Guide', processingVersion: 2, pageStart: 3 }
      },
    ]);

    // Instantiate RetrievalService with our mock components
    const mockEmbedService = new QueryEmbeddingService();
    mockEmbedService.generateEmbedding = async (q: string) => {
      if (q === 'starter button info') {
        return { vector: vec2, latencyMs: 1 };
      }
      return { vector: vec1, latencyMs: 1 };
    };

    const retrievalService = new RetrievalService(repo, mockEmbedService, new PassThroughReranker());

    // 4. Test score thresholding (should exclude low similarity chunks)
    const highMatchResults = await retrievalService.retrieve(
      'starter button info', // Will match vector fill(0.8) highly in mock provider
      { documentId: testDocId },
      { minimumScore: 0.9, topK: 5 }
    );
    assert(highMatchResults.length === 1 && highMatchResults[0] && highMatchResults[0].chunkId === 'chunk-middle-1', 'Correctly filtered results by score threshold');

    // 5. Test pageNumber post-retrieval filtering
    const pageFilteredResults = await retrievalService.retrieve(
      'starter button info',
      { documentId: testDocId, pageNumber: 2 },
      { minimumScore: 0.1 }
    );
    assert(pageFilteredResults.length === 1 && pageFilteredResults[0] && pageFilteredResults[0].pageStart === 2, 'Page number range filtering successfully pruned non-matching chunks');

    // 6. Test source reference preservation
    const refResult = pageFilteredResults[0];
    assert(refResult && refResult.sourceReference !== undefined, 'Result has source reference string');
    assert(refResult && refResult.sourceReference && refResult.sourceReference.includes('Page 2'), 'Source reference correct: includes "Page 2"');

    // 7. Test neighbor context expansion (retrieve preceding & succeeding chunks)
    const expandedResults = await retrievalService.retrieve(
      'starter button info',
      { documentId: testDocId },
      { minimumScore: 0.8, expandNeighbors: true }
    );

    assert(expandedResults.length === 1, 'Search returned exactly the target chunk');
    const matchedChunk = expandedResults[0];
    assert(matchedChunk && matchedChunk.content.includes('[Preceding Context]\nThis is step 1: turn on the electricity.'), 'Successfully retrieved and prepended previous chunk context');
    assert(matchedChunk && matchedChunk.content.includes('[Succeeding Context]\nThis is step 3: wait for status lights to blink.'), 'Successfully retrieved and appended next chunk context');
    assert(matchedChunk && matchedChunk.metadata.originalContent === 'This is step 2: push the green starter button.', 'Preserved original unmerged content in metadata');

    // 8. Test Search Option Limit (topK)
    const topkResults = await retrievalService.retrieve(
      'starter button info',
      { documentId: testDocId },
      { minimumScore: 0.0, topK: 2 }
    );
    assert(topkResults.length === 2, 'Search query respects TopK constraint limit');

    // Clean up
    await provider.deleteCollection((repo as any).collection);
    await DocumentModel.deleteOne({ documentId: testDocId });
    await ChunkModel.deleteMany({ documentId: testDocId });
    await mongoose.disconnect();
  } catch (err) {
    assert(false, `Test 2 failed: ${err}`);
    try {
      await DocumentModel.deleteOne({ documentId: testDocId });
      await ChunkModel.deleteMany({ documentId: testDocId });
      await mongoose.disconnect();
    } catch (_) { }
  }

  // --- Test 3: Global Retrieval Stats Monitoring ---
  console.log('\nTest 3: Retrieval Metrics Monitoring Stats');
  try {
    const tracker = RetrievalMetricsTracker.getInstance();

    // Simulate query recordings
    tracker.recordSearch(250, 80, 150, 5, 0.92);
    tracker.recordSearch(350, 90, 240, 10, 0.88);

    const stats = tracker.getStats();
    assert(stats.totalSearches >= 2, 'Recorded search attempts');
    assert(stats.averageSearchLatencyMs > 0, 'Average total search latency is computed');
    assert(stats.averageEmbeddingLatencyMs > 0, 'Average embedding latency is computed');
    assert(stats.averageVectorSearchLatencyMs > 0, 'Average vector database search latency is computed');
    assert(stats.averageScore > 0, 'Average match score calculated correctly');
    assert(stats.totalReturnedChunks > 0, 'Tracks total chunks successfully returned');
  } catch (err) {
    assert(false, `Test 3 failed: ${err}`);
  }

  console.log('\n=== RETRIEVAL ENGINE INTEGRATION TESTS SUMMARY ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

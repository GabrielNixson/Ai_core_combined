"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
require("../utils/canvasMock");
const mongoose_1 = __importDefault(require("mongoose"));
const qdrantVector_provider_1 = require("../vector/providers/qdrantVector.provider");
const vector_repository_1 = require("../vector/repositories/vector.repository");
const vectorSync_service_1 = require("../vector/services/vectorSync.service");
const vector_queue_1 = require("../vector/queue/vector.queue");
const vectorSync_worker_1 = require("../vector/workers/vectorSync.worker");
const metrics_1 = require("../vector/utils/metrics");
const vector_types_1 = require("../vector/models/vector.types");
const documentChunk_1 = require("../chunking/models/documentChunk");
const Document_1 = require("../models/Document");
const document_repository_1 = require("../repositories/document.repository");
const chunk_repository_1 = require("../chunking/repositories/chunk.repository");
const config_1 = require("../config/config");
const uuid_1 = require("uuid");
const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
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
    console.log('=== STARTING VECTOR INTEGRATION TESTS ===\n');
    // --- Test 1: Provider Mock Mode & Cosine Similarity ---
    console.log('Test 1: Provider Mock Mode & Similarity Search');
    try {
        const provider = new qdrantVector_provider_1.QdrantVectorProvider();
        const collection = 'test-collection';
        // 1. Create collection
        await provider.createCollection(collection, 3, 'Cosine');
        const exists = await provider.collectionExists(collection);
        assert(exists, 'Collection created and exists');
        // 2. Upsert vectors
        await provider.upsertVectors(collection, [
            { id: '1', vector: [1.0, 0.0, 0.0], payload: { type: 'test', documentId: 'doc-1' } },
            { id: '2', vector: [0.0, 1.0, 0.0], payload: { type: 'test', documentId: 'doc-1' } },
            { id: '3', vector: [0.707, 0.707, 0.0], payload: { type: 'other', documentId: 'doc-2' } },
        ]);
        // 3. Search exact match
        const searchResult1 = await provider.search(collection, [1.0, 0.0, 0.0], 1);
        assert(searchResult1.length === 1 && searchResult1[0] && searchResult1[0].id === '1', 'Found exact match for vector 1');
        // 4. Search with filter
        const searchResultFiltered = await provider.search(collection, [0.0, 1.0, 0.0], 5, { type: 'other' });
        assert(searchResultFiltered.length === 1 && searchResultFiltered[0] && searchResultFiltered[0].id === '3', 'Search respects payload metadata filter');
        // 5. Delete collection
        await provider.deleteCollection(collection);
        const postDeleteExists = await provider.collectionExists(collection);
        assert(!postDeleteExists, 'Collection deleted successfully');
    }
    catch (err) {
        assert(false, `Test 1 failed: ${err}`);
    }
    // --- Test 2: Repository Wrapper ---
    console.log('\nTest 2: VectorRepository Wrapper');
    try {
        const repo = new vector_repository_1.VectorRepository(new qdrantVector_provider_1.QdrantVectorProvider());
        await repo.ensureCollection(3);
        // Idempotent upsert
        await repo.upsert([
            { id: 'chunk-1', vector: [1.0, 0.0, 0.0], payload: { documentId: 'doc-1' } },
        ]);
        await repo.upsert([
            { id: 'chunk-1', vector: [1.0, 0.0, 0.0], payload: { documentId: 'doc-1', updated: true } },
        ]);
        const info = await repo.collectionInfo();
        assert(info.pointsCount === 1, 'Idempotent upsert did not duplicate vectors');
        // Search by document
        const docSearch = await repo.searchByDocument('doc-1', [1.0, 0.0, 0.0], 5);
        assert(docSearch.length === 1 && docSearch[0] && docSearch[0].payload.updated === true, 'Successfully retrieved updated vector payload');
        // Delete chunk vector
        await repo.deleteChunkVectors(['chunk-1']);
        const postDelInfo = await repo.collectionInfo();
        assert(postDelInfo.pointsCount === 0, 'Deleted chunk vector correctly');
        await repo.upsert([
            { id: 'chunk-2', vector: [0.0, 1.0, 0.0], payload: { documentId: 'doc-del-1' } },
            { id: 'chunk-3', vector: [0.0, 1.0, 0.0], payload: { documentId: 'doc-del-1' } },
            { id: 'chunk-4', vector: [0.0, 1.0, 0.0], payload: { documentId: 'doc-del-2' } },
        ]);
        // Delete document vectors
        await repo.deleteDocumentVectors('doc-del-1');
        const postDocDel = await repo.collectionInfo();
        assert(postDocDel.pointsCount === 1, 'Deleted document vectors, leaving other documents vectors intact');
        // Clean up collection
        const provider = repo.provider;
        await provider.deleteCollection(repo.collection);
    }
    catch (err) {
        assert(false, `Test 2 failed: ${err}`);
    }
    // --- Test 3: Metrics Tracker ---
    console.log('\nTest 3: Vector Metrics Tracker');
    try {
        const tracker = metrics_1.VectorMetricsTracker.getInstance();
        tracker.recordSuccess(100, 1200); // 100 vectors in 1.2s
        tracker.recordFailure(5);
        tracker.recordRetry(2);
        const stats = tracker.getStats();
        assert(stats.totalSynced === 100, 'Metrics recorded 100 success syncs');
        assert(stats.averageSyncLatencyMs === 12, 'Average sync latency calculated as 12ms');
        assert(stats.failedCount === 5, 'Failure count is 5');
        assert(stats.retryCount === 2, 'Retry count is 2');
    }
    catch (err) {
        assert(false, `Test 3 failed: ${err}`);
    }
    // --- Test 4: Database Sync Integration and Worker flow ---
    console.log('\nTest 4: Database Integration & Worker Execution');
    const testDocId = 'test-vector-doc-999';
    try {
        console.log(`Connecting to MongoDB at: ${config_1.config.mongoUri}`);
        await mongoose_1.default.connect(config_1.config.mongoUri);
        const docRepo = new document_repository_1.DocumentRepository();
        const chunkRepo = new chunk_repository_1.ChunkRepository();
        // Cleanup residual data
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        // 1. Create document in EMBEDDING_COMPLETED state
        await docRepo.create({
            documentId: testDocId,
            originalName: 'file.txt',
            storedName: 'file_123.txt',
            filePath: 'uploads/file.txt',
            mimeType: 'text/plain',
            extension: 'txt',
            size: 100,
            status: Document_1.DocumentStatus.EMBEDDING_COMPLETED,
            processingVersion: 1,
        });
        // 2. Create chunks with float vector embeddings
        await chunkRepo.createMany([
            {
                chunkId: 'chunk-sync-1',
                documentId: testDocId,
                chunkIndex: 0,
                content: 'Vector one text context',
                contentType: 'TEXT',
                title: 'Section 1',
                tokenEstimate: 5,
                characterCount: 15,
                embedding: [0.1, 0.2, 0.3],
                embeddingStatus: 'COMPLETED',
                embeddingDimensions: 3,
                vectorSyncStatus: vector_types_1.VectorSyncStatus.PENDING,
                createdAt: new Date(),
            },
            {
                chunkId: 'chunk-sync-2',
                documentId: testDocId,
                chunkIndex: 1,
                content: 'Vector two text context',
                contentType: 'TEXT',
                title: 'Section 2',
                tokenEstimate: 5,
                characterCount: 15,
                embedding: [0.4, 0.5, 0.6],
                embeddingStatus: 'COMPLETED',
                embeddingDimensions: 3,
                vectorSyncStatus: vector_types_1.VectorSyncStatus.PENDING,
                createdAt: new Date(),
            },
        ]);
        // 3. Queue a sync job
        const queue = vector_queue_1.VectorQueue.getInstance();
        const job = await queue.addJob({
            documentId: testDocId,
            processingVersion: 1,
            priority: 'NORMAL',
        });
        assert(job !== undefined && job.id === testDocId, 'Enqueued vector sync job successfully');
        // 4. Instantiate worker and execute processing manually
        const worker = new vectorSync_worker_1.VectorSyncWorker();
        // Inject mock Qdrant VectorProvider collection setup inside the service
        const mockProvider = new qdrantVector_provider_1.QdrantVectorProvider();
        worker.syncService = new vectorSync_service_1.VectorSyncService(new vector_repository_1.VectorRepository(mockProvider));
        const result = await worker.processJob(job);
        assert(result.status === 'COMPLETED', 'Worker finished executing job successfully');
        assert(result.syncedCount === 2, 'Worker synced both chunks into vector store');
        // 5. Verify document state in MongoDB
        const doc = await docRepo.findByDocumentId(testDocId);
        assert(doc?.status === Document_1.DocumentStatus.INDEXED, 'Document status updated to INDEXED');
        assert(doc?.progress === 100, 'Progress set to 100%');
        // 6. Verify chunks status in MongoDB
        const chunks = await chunkRepo.findByDocument(testDocId);
        assert(chunks.every(c => c.vectorSyncStatus === vector_types_1.VectorSyncStatus.SYNCED), 'All chunks set to SYNCED vector status');
        assert(chunks.every(c => c.vectorSyncedAt !== undefined), 'All chunks have vectorSyncedAt date stamps');
        // 7. Verify points in provider
        const collectionName = config_1.config.collectionName || 'documents';
        const uuid1 = (0, uuid_1.v5)('chunk-sync-1', NAMESPACE);
        const searchRes = await mockProvider.search(collectionName, [0.1, 0.2, 0.3], 5);
        assert(searchRes.length === 2 && searchRes[0] && searchRes[0].id === uuid1, 'Deterministic UUID mappings successfully resolved');
        // Cleanup
        await mockProvider.deleteCollection(collectionName);
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        await worker.close();
        await queue.removeJob(testDocId);
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        assert(false, `Test 4 failed: ${err}`);
        try {
            await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
            await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
            await mongoose_1.default.disconnect();
        }
        catch (_) { }
    }
    // --- Test 5: Worker Sync Failure & Retries ---
    console.log('\nTest 5: Vector Sync Worker Failure and Retry Handling');
    try {
        await mongoose_1.default.connect(config_1.config.mongoUri);
        const docRepo = new document_repository_1.DocumentRepository();
        const chunkRepo = new chunk_repository_1.ChunkRepository();
        await docRepo.create({
            documentId: testDocId,
            originalName: 'test.txt',
            storedName: 'test_123.txt',
            filePath: 'uploads/test.txt',
            mimeType: 'text/plain',
            extension: 'txt',
            size: 100,
            status: Document_1.DocumentStatus.EMBEDDING_COMPLETED,
            processingVersion: 1,
        });
        await chunkRepo.createMany([
            {
                chunkId: 'chunk-sync-fail',
                documentId: testDocId,
                chunkIndex: 0,
                content: 'Failure text',
                contentType: 'TEXT',
                title: 'Section 1',
                tokenEstimate: 5,
                characterCount: 12,
                embedding: [0.1, 0.2, 0.3],
                embeddingStatus: 'COMPLETED',
                embeddingDimensions: 3,
                vectorSyncStatus: vector_types_1.VectorSyncStatus.PENDING,
                createdAt: new Date(),
            },
        ]);
        const worker = new vectorSync_worker_1.VectorSyncWorker();
        // Inject a vector sync service that fails with a network exception
        class FailingProvider extends qdrantVector_provider_1.QdrantVectorProvider {
            async upsertVectors() { throw new Error('Qdrant Timeout'); }
        }
        const failRepo = new vector_repository_1.VectorRepository(new FailingProvider());
        worker.syncService = new vectorSync_service_1.VectorSyncService(failRepo);
        const mockJob = {
            id: testDocId,
            data: { documentId: testDocId, processingVersion: 1, priority: 'NORMAL' },
            attemptsMade: 0,
            opts: { attempts: 3 },
        };
        let threw = false;
        try {
            await worker.processJob(mockJob);
        }
        catch (err) {
            threw = true;
            assert(err.message === 'Qdrant Timeout', 'Worker threw the expected sync timeout error');
        }
        assert(threw, 'Worker job threw and triggered job retry');
        const retryingChunk = await chunkRepo.findChunk('chunk-sync-fail');
        assert(retryingChunk?.vectorSyncStatus === vector_types_1.VectorSyncStatus.RETRYING, 'Chunk status updated to RETRYING');
        assert(retryingChunk?.vectorSyncError === 'Qdrant Timeout', 'Captured error message in database');
        // Simulate final attempt failure
        const finalJob = {
            id: testDocId,
            data: { documentId: testDocId, processingVersion: 1, priority: 'NORMAL' },
            attemptsMade: 2,
            opts: { attempts: 3 },
        };
        let finalThrew = false;
        try {
            await worker.processJob(finalJob);
        }
        catch (err) {
            finalThrew = true;
        }
        assert(finalThrew, 'Final sync attempt failed and propagated');
        const failedChunk = await chunkRepo.findChunk('chunk-sync-fail');
        assert(failedChunk?.vectorSyncStatus === vector_types_1.VectorSyncStatus.FAILED, 'Chunk vectorSyncStatus set to FAILED after final attempt');
        const doc = await docRepo.findByDocumentId(testDocId);
        assert(doc?.status === Document_1.DocumentStatus.FAILED, 'Document status set to FAILED');
        // Clean up
        await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
        await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
        await worker.close();
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        assert(false, `Test 5 failed: ${err}`);
        try {
            await Document_1.DocumentModel.deleteOne({ documentId: testDocId });
            await documentChunk_1.ChunkModel.deleteMany({ documentId: testDocId });
            await mongoose_1.default.disconnect();
        }
        catch (_) { }
    }
    console.log('\n=== VECTOR INTEGRATION TESTS SUMMARY ===');
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

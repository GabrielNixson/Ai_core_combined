import '../utils/canvasMock';
import mongoose from 'mongoose';
import { QueueService } from '../queue/queue.service';
import { WorkerService } from '../workers/worker.service';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentStatus, DocumentModel } from '../models/Document';
import { JOB_TYPES } from '../queue/queue.constants';
import { ChunkModel } from '../chunking/models/documentChunk';
import { config } from '../config/config';

// Utility helper to wait
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  console.log('\n--- Starting Phase 12 Asynchronous Queue Tests ---');

  try {
    // Connect database
    await mongoose.connect(config.mongoUri);
    const docRepo = new DocumentRepository();
    const queueService = QueueService.getInstance();
    const workerService = WorkerService.getInstance();

    const testDocId = 'async-test-doc-123';

    // Clear old test data
    await DocumentModel.deleteMany({ documentId: { $regex: /^async-test/ } });
    await ChunkModel.deleteMany({ documentId: { $regex: /^async-test/ } });
    await queueService.cleanQueue();

    // Test 1: Queue and worker creation
    const stats = await queueService.getQueueStats();
    assert(stats.waiting !== undefined, 'Queue stats fetched successfully');

    // Test 2: Priority queues
    // Add multiple priority jobs (paused queue first so they don't get processed immediately)
    await queueService.pauseQueue();

    const jobLow = await queueService.addJob(
      JOB_TYPES.DOCUMENT_PROCESS_JOB,
      {
        documentId: 'async-test-low',
        documentType: 'TXT',
        storagePath: '/mock/path',
        requestedBy: 'user',
        processingVersion: 1,
        priority: 'LOW',
        retryCount: 0,
      },
      'LOW'
    );

    const jobUrgent = await queueService.addJob(
      JOB_TYPES.DOCUMENT_PROCESS_JOB,
      {
        documentId: 'async-test-urgent',
        documentType: 'TXT',
        storagePath: '/mock/path',
        requestedBy: 'user',
        processingVersion: 1,
        priority: 'URGENT',
        retryCount: 0,
      },
      'URGENT'
    );

    assert(jobLow.opts.priority === 30, 'LOW priority correctly mapped to numerical 30');
    assert(jobUrgent.opts.priority === 1, 'URGENT priority correctly mapped to numerical 1');

    // Clean priority test jobs
    await jobLow.remove();
    await jobUrgent.remove();
    await queueService.resumeQueue();

    // Test 3: Document Async processing pipeline & progress transitions
    // Setup dummy doc
    const dummyDoc = await docRepo.create({
      documentId: testDocId,
      originalName: 'test_async.txt',
      storedName: 'test_async.txt',
      filePath: './uploads/test_async.txt', // TXT parser parses standard files
      mimeType: 'text/plain',
      extension: '.txt',
      size: 50,
      status: DocumentStatus.UPLOADED,
    });

    // Write temporary text file to process
    const fs = await import('fs');
    const path = await import('path');
    const fullPath = path.resolve(dummyDoc.filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, 'Hello from Phase 12 Asynchronous Workers Pipeline!');

    // Start background workers
    await workerService.startWorkers(2); // Spawn 2 workers concurrently
    const workerHealth = workerService.getHealth();
    assert(workerHealth.activeWorkers === 2, 'Successfully spawned multiple background workers');

    // Queue document processing
    await queueService.addJob(
      JOB_TYPES.DOCUMENT_PROCESS_JOB,
      {
        documentId: testDocId,
        documentType: 'TXT',
        storagePath: dummyDoc.filePath,
        requestedBy: 'user',
        processingVersion: 1,
        priority: 'NORMAL',
        retryCount: 0,
      },
      'NORMAL'
    );

    // Wait and poll progress state
    let docState = await docRepo.findByDocumentId(testDocId);
    let attempts = 0;
    while (docState?.status !== DocumentStatus.COMPLETED && docState?.status !== DocumentStatus.FAILED && attempts < 20) {
      await delay(400);
      docState = await docRepo.findByDocumentId(testDocId);
      attempts++;
    }

    assert(docState?.status === DocumentStatus.COMPLETED, `Async pipeline completed (Status: ${docState?.status})`);
    assert(docState?.progress === 100, `Async pipeline reached 100% progress`);

    // Verify chunks exist (checks that parsing and chunking succeeded asynchronously)
    const chunksCount = await ChunkModel.countDocuments({ documentId: testDocId });
    assert(chunksCount > 0, `Chunks successfully persisted asynchronously by the worker: ${chunksCount} chunks`);

    // Test 4: Job Cancellation
    const cancelDocId = 'async-test-cancel';
    await docRepo.create({
      documentId: cancelDocId,
      originalName: 'cancel.txt',
      storedName: 'cancel.txt',
      filePath: './uploads/cancel.txt',
      mimeType: 'text/plain',
      extension: '.txt',
      size: 10,
      status: DocumentStatus.UPLOADED,
    });

    // Pause queue to inspect job
    await queueService.pauseQueue();
    await queueService.addJob(
      JOB_TYPES.DOCUMENT_PROCESS_JOB,
      {
        documentId: cancelDocId,
        documentType: 'TXT',
        storagePath: './uploads/cancel.txt',
        requestedBy: 'user',
        processingVersion: 1,
        priority: 'NORMAL',
        retryCount: 0,
      },
      'NORMAL'
    );

    // Cancel job
    const cancelled = await queueService.cancelJob(cancelDocId);
    assert(cancelled === true, 'Job cancelled successfully');

    const cancelledDoc = await docRepo.findByDocumentId(cancelDocId);
    assert(cancelledDoc?.status === DocumentStatus.CANCELLED, 'Cancelled document status updated to CANCELLED');

    // Resume queue
    await queueService.resumeQueue();

    // Clean up cancel test files/records
    await DocumentModel.deleteOne({ documentId: cancelDocId });

    // Test 5: Retries Policy mapping
    const failedDocId = 'async-test-fail-retry';
    await docRepo.create({
      documentId: failedDocId,
      originalName: 'fail.txt',
      storedName: 'fail.txt',
      filePath: './uploads/non_existent.txt', // will fail since file does not exist
      mimeType: 'text/plain',
      extension: '.txt',
      size: 10,
      status: DocumentStatus.UPLOADED,
    });

    await queueService.addJob(
      JOB_TYPES.DOCUMENT_PROCESS_JOB,
      {
        documentId: failedDocId,
        documentType: 'TXT',
        storagePath: './uploads/non_existent.txt',
        requestedBy: 'user',
        processingVersion: 1,
        priority: 'NORMAL',
        retryCount: 0,
      },
      'NORMAL'
    );

    // Wait to see if worker executes and job fails
    let failDoc = await docRepo.findByDocumentId(failedDocId);
    let failAttempts = 0;
    while (failDoc?.status !== DocumentStatus.FAILED && failAttempts < 20) {
      await delay(400);
      failDoc = await docRepo.findByDocumentId(failedDocId);
      failAttempts++;
    }

    assert(failDoc?.status === DocumentStatus.FAILED, 'Failed processing sets status to FAILED');
    assert(failDoc?.errorDetails !== undefined, `Failure updates error details: ${failDoc?.errorDetails}`);

    // Cleanup worker service
    await workerService.stopWorkers();
    await queueService.cleanQueue();
    await queueService.shutdown();

    // Clean up mock text file
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    await DocumentModel.deleteMany({ documentId: { $regex: /^async-test/ } });

    await mongoose.disconnect();
  } catch (err) {
    assert(false, `Runtime queue testing failed: ${err}`);
    try {
      await mongoose.disconnect();
    } catch (_) { }
  }

  console.log('\n--- Phase 12 Queue Tests Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

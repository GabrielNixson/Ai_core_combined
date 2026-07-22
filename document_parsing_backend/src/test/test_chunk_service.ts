import '../utils/canvasMock';
import mongoose from 'mongoose';
import { ChunkGenerationService } from '../chunking/services/chunkGeneration.service';
import { TokenEstimator } from '../chunking/utils/tokenEstimator';
import { ChunkRepository } from '../chunking/repositories/chunk.repository';
import { ParsedDocument } from '../types/parsedDocument';
import { DocumentType } from '../types/documentType';
import { config } from '../config/config';

const testDoc: ParsedDocument = {
  documentId: 'chunk-test-document-999',
  documentType: DocumentType.MARKDOWN,
  metadata: {
    title: 'Solar Inverter Manual',
    sourceType: 'MARKDOWN',
  },
  sections: [
    {
      title: 'Safety Warning',
      level: 1,
      content: [
        {
          type: 'heading',
          content: 'Danger High Voltage',
        },
        {
          type: 'paragraph',
          content: 'Do not touch internal terminals.',
        },
        {
          type: 'list',
          content: ['Wear safety gloves', 'Use insulated tools'],
        },
      ],
    },
    {
      title: 'Wiring Guide',
      level: 1,
      content: [
        {
          type: 'paragraph',
          content: 'Connect the solar panel array directly to solar input port A.',
        },
        {
          type: 'table',
          content: {
            columns: ['Pin', 'Label'],
            rows: [
              ['1', 'V+'],
              ['2', 'V-'],
            ],
          },
          metadata: { page: 12 },
        },
      ],
    },
    {
      title: 'Modbus Interface',
      level: 1,
      content: [
        {
          type: 'spreadsheet',
          content: {
            sheet: 'Registers',
            columns: ['Address', 'Description'],
            rows: Array.from({ length: 70 }, (_, i) => ({
              Address: { value: 40000 + i, type: 'number' },
              Description: { value: `Register ${i}`, type: 'string' },
            })),
          },
        },
        {
          type: 'json',
          content: { baudRate: 9600 },
        },
      ],
    },
    {
      title: 'Overview Slide',
      level: 1,
      content: [
        {
          type: 'slide',
          content: {
            slideNumber: 1,
            title: 'System Architecture',
            content: 'Contains edge devices connected via MQTT.',
          },
        },
        {
          type: 'notes',
          content: 'Highlight the latency constraint.',
        },
      ],
    },
  ],
};

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

  console.log('\n--- Starting Phase 10 Chunk Generation Engine Tests ---');

  // Test 1: Token Estimator
  try {
    const text = 'Solar inverter calibration instruction'; // 38 chars
    const tokens = TokenEstimator.estimateTokens(text);
    assert(tokens === Math.ceil(38 / 4), `Estimated correct tokens for simple text (chars: 38, tokens: ${tokens})`);
    assert(TokenEstimator.estimateTokens('') === 0, 'Empty string yields 0 tokens');
  } catch (err) {
    assert(false, `Test 1 (Token Estimator) failed: ${err}`);
  }

  // Test 2: Chunk Generation Service - Section Traversal & Strategy mapping
  try {
    const service = new ChunkGenerationService({ mergeSmallChunks: false });
    const chunks = service.generateChunks(testDoc);

    // Chunks count should match block types:
    // Section 1: 1 heading + 1 paragraph + 1 list = 3 chunks
    // Section 2: 1 paragraph + 1 table = 2 chunks
    // Section 3: 70 rows batched by 50 = 2 spreadsheet chunks + 1 json chunk = 3 chunks
    // Section 4: 1 slide + 1 notes (notes skipped but slide integrates notes) = 1 chunk
    // Total chunks: 3 + 2 + 3 + 1 = 9 chunks.
    assert(chunks.length === 9, `Generated correct number of raw strategy chunks (expected: 9, got: ${chunks.length})`);

    // Verify slide notes integration
    const slideChunk = chunks.find((c) => c.contentType === 'PRESENTATION');
    assert(slideChunk !== undefined, 'Slide block mapped to PRESENTATION chunk type');
    assert(slideChunk?.slideNumber === 1, 'Preserved slide number');
    assert(slideChunk?.content.includes('System Architecture'), 'Slide text preserved');
    assert(slideChunk?.content.includes('Highlight the latency constraint'), 'Presenter notes merged into slide chunk content');
    assert(slideChunk?.metadata?.notes === 'Highlight the latency constraint.', 'Notes preserved in metadata');

    // Verify structured json chunk
    const jsonChunk = chunks.find((c) => c.contentType === 'STRUCTURED_DATA');
    assert(jsonChunk !== undefined, 'JSON block mapped to STRUCTURED_DATA chunk type');
    assert(jsonChunk?.content.includes('"baudRate": 9600'), 'Indented JSON layout preserved');

    // Verify spreadsheet batching & column header repeat
    const sheetChunks = chunks.filter((c) => c.contentType === 'SPREADSHEET');
    assert(sheetChunks.length === 2, 'Spreadsheet divided into 2 batches (offset 0 and 50)');
    assert(sheetChunks[0]?.content.includes('Address | Description'), 'Spreadsheet batch 1 contains headers');
    assert(sheetChunks[0]?.content.includes('40000'), 'Spreadsheet batch 1 contains offset 0 records');
    assert(sheetChunks[1]?.content.includes('Address | Description'), 'Spreadsheet batch 2 contains repeated headers');
    assert(sheetChunks[1]?.content.includes('40050'), 'Spreadsheet batch 2 contains offset 50 records');
    assert(sheetChunks[0]?.metadata?.sheet === 'Registers', 'Preserved sheet name metadata');
  } catch (err) {
    assert(false, `Test 2 (Strategy Decomposition) failed: ${err}`);
  }

  // Test 3: Semantic Merge Builder
  try {
    const service = new ChunkGenerationService({
      mergeSmallChunks: true,
      maxChunkTokens: 200,
    });
    const chunks = service.generateChunks(testDoc);

    // After merging:
    // Section 1: heading + paragraph + list can be merged into 1 single TEXT chunk.
    // Section 2: paragraph (TEXT) is separate, table is independent (not mergeable). Total: 2 chunks.
    // Section 3: spreadsheet batches (independent), JSON (independent). Total: 3 chunks.
    // Section 4: slide (independent). Total: 1 chunk.
    // Total chunks expected: 1 + 2 + 3 + 1 = 7 chunks.
    assert(chunks.length === 7, `Merged adjacent small text segments cleanly (expected: 7, got: ${chunks.length})`);

    const sec1TextChunks = chunks.filter((c) => c.section === 'Safety Warning');
    assert(sec1TextChunks.length === 1, 'Section 1 conjoined all contiguous text chunks');
    assert(
      sec1TextChunks[0]?.content.includes('Danger High Voltage\n\nDo not touch internal terminals.\n\n- Wear safety gloves\n- Use insulated tools'),
      'Text conjoined using double newlines and formatted lists'
    );

    // Verify that table was NOT merged into Wiring Guide paragraph
    const sec2Chunks = chunks.filter((c) => c.section === 'Wiring Guide');
    assert(sec2Chunks.length === 2, 'Table remains an independent chunk');
    assert(sec2Chunks[1]?.contentType === 'TABLE', 'Table chunk type remains TABLE');
    assert(sec2Chunks[1]?.content.includes('| Pin | Label |'), 'Table GFM layout intact');
    assert(sec2Chunks[1]?.pageStart === 12, 'Table page number metadata preserved');
  } catch (err) {
    assert(false, `Test 3 (Semantic Merging) failed: ${err}`);
  }

  // Test 4: MongoDB Database Persistence & Teardown
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri);

    const repository = new ChunkRepository();
    const service = new ChunkGenerationService();
    const chunks = service.generateChunks(testDoc);

    // Tear down pre-existing tests data
    await repository.deleteChunks(testDoc.documentId);

    // Bulk Insert
    const inserted = await repository.insertMany(chunks);
    assert(inserted.length === chunks.length, `Successfully persisted ${chunks.length} chunks into MongoDB`);

    // Verify insertion lookup
    const found = await repository.find({ documentId: testDoc.documentId });
    assert(found.length === chunks.length, 'Database retrieved correct chunk count');
    assert(found[0]?.chunkId.startsWith(`chunk-${testDoc.documentId}-`), 'Preserved indexed chunkId keys');

    // Tear down clean up
    await repository.deleteChunks(testDoc.documentId);
    const postDelete = await repository.find({ documentId: testDoc.documentId });
    assert(postDelete.length === 0, 'Database teardown completed successfully');

    await mongoose.disconnect();
  } catch (err) {
    assert(false, `Test 4 (MongoDB Persistence) failed: ${err}`);
    try {
      await mongoose.disconnect();
    } catch (_) { }
  }

  console.log('\n--- Phase 10 Chunk Generation Tests Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

import '../utils/canvasMock';
import fs from 'fs';
import path from 'path';
import { ParserRegistry } from '../parsers/registry/parserRegistry';
import { ParserFactory } from '../parsers/factory/parserFactory';
import { DocumentType } from '../types/documentType';
import { PdfParser } from '../parsers/pdf/pdfParser';
import { BadRequestError } from '../utils/errors';

// Setup directories
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const testPdfPath = path.join(uploadsDir, 'test.pdf');
const emptyPdfPath = path.join(uploadsDir, 'empty.pdf');
const corruptedPdfPath = path.join(uploadsDir, 'corrupted.pdf');

async function runTests() {
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`[PASS] - ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] - ${message}`);
      failed++;
    }
  };

  console.log('\n--- Starting PDF Parser Tests ---');

  // Test 1: Parser Registration
  try {
    const parser = ParserRegistry.getParser(DocumentType.PDF);
    assert(parser instanceof PdfParser, 'PdfParser should be registered in ParserRegistry');
  } catch (err) {
    assert(false, `Test 1 failed with error: ${err}`);
  }

  // Test 2: ParserFactory returns PdfParser
  try {
    const parser = ParserFactory.getParser(DocumentType.PDF);
    assert(parser instanceof PdfParser, 'ParserFactory should return PdfParser instance for PDF type');
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err}`);
  }

  // Test 3: Empty PDF Validation
  try {
    fs.writeFileSync(emptyPdfPath, Buffer.alloc(0));
    const parser = new PdfParser();
    await parser.parse({
      documentId: 'empty-doc',
      documentType: DocumentType.PDF,
      filePath: emptyPdfPath,
      originalFileName: 'empty.pdf',
    });
    assert(false, 'Parsing an empty PDF should fail');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('Empty PDF'),
      'Parsing empty PDF throws BadRequestError'
    );
  } finally {
    if (fs.existsSync(emptyPdfPath)) fs.unlinkSync(emptyPdfPath);
  }

  // Test 4: Corrupted PDF Validation
  try {
    fs.writeFileSync(corruptedPdfPath, Buffer.from('NOT_A_PDF_CONTENT_JUST_RANDOM_TEXT'));
    const parser = new PdfParser();
    await parser.parse({
      documentId: 'corrupted-doc',
      documentType: DocumentType.PDF,
      filePath: corruptedPdfPath,
      originalFileName: 'corrupted.pdf',
    });
    assert(false, 'Parsing a corrupted PDF should fail');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('not a valid PDF or is corrupted'),
      'Parsing corrupted PDF throws BadRequestError'
    );
  } finally {
    if (fs.existsSync(corruptedPdfPath)) fs.unlinkSync(corruptedPdfPath);
  }

  // Test 5: Valid PDF Content & Metadata Extraction
  if (!fs.existsSync(testPdfPath)) {
    console.log(`[SKIP] - Valid PDF tests skipped. ${testPdfPath} is missing.`);
  } else {
    try {
      const parser = new PdfParser();
      const parsedDoc = await parser.parse({
        documentId: 'valid-doc',
        documentType: DocumentType.PDF,
        filePath: testPdfPath,
        originalFileName: 'test.pdf',
      });

      // Assert basic properties
      assert(parsedDoc.documentId === 'valid-doc', 'Document ID matches context');
      assert(parsedDoc.documentType === DocumentType.PDF, 'Document type is PDF');
      assert(
        parsedDoc.metadata.totalPages !== undefined && parsedDoc.metadata.totalPages > 0,
        `Metadata contains totalPages (pages: ${parsedDoc.metadata.totalPages})`
      );
      assert(parsedDoc.sections.length > 0, 'Parsed document has sections');

      // Test 6: Page numbers preserved
      let hasPageCitation = true;
      for (const section of parsedDoc.sections) {
        for (const block of section.content) {
          if (!block.metadata || block.metadata.page === undefined) {
            hasPageCitation = false;
          }
        }
      }
      assert(hasPageCitation, 'All content blocks preserve their source page numbers in metadata');

      console.log('\nSample Parsed Sections Structure:');
      console.log(JSON.stringify(parsedDoc.sections.slice(0, 2), null, 2));

    } catch (err) {
      assert(false, `Valid PDF parsing failed: ${err}`);
    }
  }

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

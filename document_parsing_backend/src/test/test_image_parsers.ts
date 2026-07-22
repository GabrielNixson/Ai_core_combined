import '../utils/canvasMock';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ParserFactory } from '../parsers/factory/parserFactory';
import { DocumentType } from '../types/documentType';
import { ImageParser } from '../parsers/image/imageParser';
import { BadRequestError } from '../utils/errors';
import { OCRProvider } from '../ocr/ocrProvider.interface';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Temporary test file paths
const pngPath = path.join(uploadsDir, 'test_mock.png');
const jpegPath = path.join(uploadsDir, 'test_mock.jpeg');
const emptyPath = path.join(uploadsDir, 'test_empty.png');
const corruptedPath = path.join(uploadsDir, 'test_corrupted.png');

async function generateMockImage(format: 'png' | 'jpeg'): Promise<Buffer> {
  return sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .toFormat(format)
    .toBuffer();
}

// Dummy OCR Provider implementation to verify compile-time contract of OCRProvider interface
class DummyOCRProvider implements OCRProvider {
  public async extractText(imagePath: string): Promise<string> {
    return `Extracted dummy text from ${imagePath}`;
  }
}

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

  console.log('\n--- Starting Phase 8 Image Parser Framework Tests ---');

  // Test 1: Parser Factory Mapping
  try {
    assert(
      ParserFactory.getParser(DocumentType.PNG) instanceof ImageParser,
      'Factory maps PNG to ImageParser'
    );
    assert(
      ParserFactory.getParser(DocumentType.JPEG) instanceof ImageParser,
      'Factory maps JPEG to ImageParser'
    );
  } catch (err) {
    assert(false, `Test 1 (Factory Registration) failed: ${err}`);
  }

  // Test 2: OCR Provider Interface contract verification
  try {
    const provider: OCRProvider = new DummyOCRProvider();
    const result = await provider.extractText('/path/to/diagram.png');
    assert(
      result === 'Extracted dummy text from /path/to/diagram.png',
      'OCRProvider interface contract compiled and executed correctly'
    );
  } catch (err) {
    assert(false, `Test 2 (OCRProvider Interface Verification) failed: ${err}`);
  }

  // Test 3: PNG Metadata & ParsedDocument Extraction
  try {
    const pngBuffer = await generateMockImage('png');
    fs.writeFileSync(pngPath, pngBuffer);

    const parser = new ImageParser();
    const doc = await parser.parse({
      documentId: 'png-doc-1',
      documentType: DocumentType.PNG,
      filePath: pngPath,
      originalFileName: 'test_mock.png',
    });

    assert(doc.documentType === DocumentType.PNG, 'DocumentType is PNG');
    assert(doc.metadata.sourceType === 'IMAGE', 'metadata.sourceType is IMAGE');
    assert(doc.metadata.format === 'PNG', 'Format is PNG');
    assert(doc.metadata.width === 10, 'Width is 10');
    assert(doc.metadata.height === 10, 'Height is 10');
    assert(doc.metadata.fileSize === pngBuffer.length, 'fileSize matches raw buffer size');

    assert(doc.sections.length === 1, 'Pushed 1 section');
    assert(doc.sections[0]?.title === 'Image - test_mock.png', 'Section title matches "Image - test_mock.png"');
    assert(doc.sections[0]?.level === 1, 'Section level is 1');

    const imageBlock = doc.sections[0]?.content[0];
    assert(imageBlock?.type === 'image', 'ContentBlock type is "image"');
    assert(imageBlock?.content.fileName === 'test_mock.png', 'ContentBlock contains fileName');
    assert(imageBlock?.content.width === 10, 'ContentBlock contains width');
    assert(imageBlock?.content.height === 10, 'ContentBlock contains height');
    assert(imageBlock?.content.ocrStatus === 'NOT_PROCESSED', 'ocrStatus is initialized to "NOT_PROCESSED"');
  } catch (err) {
    assert(false, `Test 3 (PNG Parsing) failed: ${err}`);
  }

  // Test 4: JPEG Metadata & ParsedDocument Extraction
  try {
    const jpegBuffer = await generateMockImage('jpeg');
    fs.writeFileSync(jpegPath, jpegBuffer);

    const parser = new ImageParser();
    const doc = await parser.parse({
      documentId: 'jpeg-doc-1',
      documentType: DocumentType.JPEG,
      filePath: jpegPath,
      originalFileName: 'test_mock.jpeg',
    });

    assert(doc.documentType === DocumentType.JPEG, 'DocumentType is JPEG');
    assert(doc.metadata.format === 'JPEG', 'Format is JPEG');
    assert(doc.metadata.width === 10, 'Width is 10');
    assert(doc.metadata.height === 10, 'Height is 10');
    assert(doc.sections[0]?.content[0]?.content.ocrStatus === 'NOT_PROCESSED', 'ocrStatus is "NOT_PROCESSED" for JPEG');
  } catch (err) {
    assert(false, `Test 4 (JPEG Parsing) failed: ${err}`);
  }

  // Test 5: Invalid & Corrupted Images
  try {
    fs.writeFileSync(emptyPath, '');
    const parser = new ImageParser();
    await parser.parse({
      documentId: 'empty-doc',
      documentType: DocumentType.PNG,
      filePath: emptyPath,
      originalFileName: 'test_empty.png',
    });
    assert(false, 'Should throw BadRequestError on empty image file');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('Empty image file'),
      'Threw BadRequestError on empty image file'
    );
  }

  try {
    fs.writeFileSync(corruptedPath, 'This is a txt file containing garbage, not a png.');
    const parser = new ImageParser();
    await parser.parse({
      documentId: 'corrupted-doc',
      documentType: DocumentType.PNG,
      filePath: corruptedPath,
      originalFileName: 'test_corrupted.png',
    });
    assert(false, 'Should throw BadRequestError on corrupted image file');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('Invalid or corrupted image file'),
      'Threw BadRequestError on corrupted image file'
    );
  }

  // Cleanup files
  try {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(jpegPath);
    fs.unlinkSync(emptyPath);
    fs.unlinkSync(corruptedPath);
  } catch (_) { }

  console.log('\n--- Phase 8 Image Parser Tests Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

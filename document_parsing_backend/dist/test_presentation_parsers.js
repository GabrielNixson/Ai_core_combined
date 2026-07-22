"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/canvasMock");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jszip_1 = __importDefault(require("jszip"));
const parserFactory_1 = require("./parsers/factory/parserFactory");
const documentType_1 = require("./types/documentType");
const pptxParser_1 = require("./parsers/pptx/pptxParser");
const errors_1 = require("./utils/errors");
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Test file paths
const pptxValidPath = path_1.default.join(uploadsDir, 'test_presentation.pptx');
const pptxEmptyPath = path_1.default.join(uploadsDir, 'test_empty.pptx');
const pptxCorruptedPath = path_1.default.join(uploadsDir, 'test_corrupted.pptx');
async function createMockPptx() {
    const zip = new jszip_1.default();
    // 1. docProps/core.xml (Author details)
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator>Acme Energy Corp</dc:creator>
</cp:coreProperties>`);
    // 2. ppt/_rels/presentation.xml.rels (Slide relationships)
    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdSlide1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rIdSlide2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`);
    // 3. ppt/presentation.xml (Slides order)
    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rIdSlide1"/>
    <p:sldId id="257" r:id="rIdSlide2"/>
  </p:sldIdLst>
</p:presentation>`);
    // 4. ppt/slides/slide1.xml (Slide 1: Title and bullet list)
    zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:cNvSpPr/>
          <p:nvPr>
            <p:ph type="title"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Introduction</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content 1"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:txBody>
          <a:p>
            <a:pPr lvl="0"/>
            <a:r>
              <a:t>Verify connection</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr lvl="0"/>
            <a:r>
              <a:t>Configure device</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);
    // 5. ppt/slides/_rels/slide1.xml.rels (Slide 1 rels: speaker notes & image link)
    zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNotes1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`);
    // 6. ppt/notesSlides/notesSlide1.xml (Slide 1: Speaker notes)
    zip.file('ppt/notesSlides/notesSlide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Presenter notes: Mention hardware specification limits.</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`);
    // 7. ppt/slides/slide2.xml (Slide 2: Title and Table)
    zip.file('ppt/slides/slide2.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 2"/>
          <p:cNvSpPr/>
          <p:nvPr>
            <p:ph type="ctrTitle"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Register Map</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:graphicFrame>
        <a:tbl>
          <a:tr>
            <a:tc>
              <a:txBody>
                <a:p>
                  <a:r>
                    <a:t>Address</a:t>
                  </a:r>
                </a:p>
              </a:txBody>
            </a:tc>
            <a:tc>
              <a:txBody>
                <a:p>
                  <a:r>
                    <a:t>Description</a:t>
                  </a:r>
                </a:p>
              </a:txBody>
            </a:tc>
          </a:tr>
          <a:tr>
            <a:tc>
              <a:txBody>
                <a:p>
                  <a:r>
                    <a:t>40001</a:t>
                  </a:r>
                </a:p>
              </a:txBody>
            </a:tc>
            <a:tc>
              <a:txBody>
                <a:p>
                  <a:r>
                    <a:t>Voltage</a:t>
                  </a:r>
                </a:p>
              </a:txBody>
            </a:tc>
          </a:tr>
        </a:tbl>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
</p:sld>`);
    return zip.generateAsync({ type: 'nodebuffer' });
}
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
    console.log('\n--- Starting Phase 7 PPTX Parser Tests ---');
    // Test 1: Parser Registration & Factory Check
    try {
        assert(parserFactory_1.ParserFactory.getParser(documentType_1.DocumentType.PPTX) instanceof pptxParser_1.PptxParser, 'Factory maps PPTX to PptxParser');
    }
    catch (err) {
        assert(false, `Test 1 (Factory Registration) failed: ${err}`);
    }
    // Test 2: Valid PPTX Extraction - Simple & Nested Contents
    try {
        const buffer = await createMockPptx();
        fs_1.default.writeFileSync(pptxValidPath, buffer);
        const parser = new pptxParser_1.PptxParser();
        const doc = await parser.parse({
            documentId: 'pptx-valid-doc',
            documentType: documentType_1.DocumentType.PPTX,
            filePath: pptxValidPath,
            originalFileName: 'test_presentation.pptx',
        });
        assert(doc.documentType === documentType_1.DocumentType.PPTX, 'DocumentType is PPTX');
        assert(doc.metadata.sourceType === 'PPTX', 'metadata.sourceType is PPTX');
        assert(doc.metadata.slideCount === 2, 'slideCount is 2');
        assert(doc.metadata.author === 'Acme Energy Corp', 'Author extracted correctly');
        assert(doc.sections.length === 2, 'Parsed 2 sections corresponding to 2 slides');
        // Test Slide 1 Structural Details
        const slide1Section = doc.sections[0];
        assert(slide1Section?.title === 'Slide 1 - Introduction', 'Slide 1 title resolved correctly');
        assert(slide1Section?.level === 1, 'Slide 1 level is 1');
        assert(slide1Section?.content[0]?.type === 'heading', 'First ContentBlock in Slide 1 is heading');
        assert(slide1Section?.content[0]?.content === 'Introduction', 'Title text extracted');
        assert(slide1Section?.content[1]?.type === 'list', 'Second ContentBlock is list');
        assert(Array.isArray(slide1Section?.content[1]?.content), 'List content is array');
        assert(slide1Section?.content[1]?.content[0] === 'Verify connection', 'List bullet 1 matches');
        assert(slide1Section?.content[1]?.content[1] === 'Configure device', 'List bullet 2 matches');
        assert(slide1Section?.content[2]?.type === 'notes', 'Third ContentBlock is notes');
        assert(slide1Section?.content[2]?.content.includes('Presenter notes:'), 'Speaker notes extracted');
        // Test metadata "slide" block shape for Slide 1
        const slide1MetaBlock = slide1Section?.content.find((b) => b.type === 'slide');
        assert(slide1MetaBlock !== undefined, 'Contains special metadata content block with type "slide"');
        assert(slide1MetaBlock?.content.slideNumber === 1, 'Metadata slideNumber is 1');
        assert(slide1MetaBlock?.content.title === 'Introduction', 'Metadata title is correct');
        assert(slide1MetaBlock?.content.content.includes('Verify connection'), 'Metadata content includes full slide text');
        // Test Slide 2 Structural Details (Tables)
        const slide2Section = doc.sections[1];
        assert(slide2Section?.title === 'Slide 2 - Register Map', 'Slide 2 title resolved correctly');
        assert(slide2Section?.content[0]?.type === 'heading', 'Slide 2 heading block parsed');
        assert(slide2Section?.content[1]?.type === 'table', 'Slide 2 table block parsed');
        const table = slide2Section?.content[1]?.content;
        assert(table.columns.length === 2, 'Table columns count is 2');
        assert(table.columns[0] === 'Address', 'Table column 1 name is Address');
        assert(table.rows.length === 1, 'Table rows count is 1');
        assert(table.rows[0][0] === '40001', 'Table cell value matches');
    }
    catch (err) {
        assert(false, `Test 2 (PPTX Valid Extraction) failed: ${err}`);
    }
    // Test 3: Invalid / Empty PPTX Files
    try {
        fs_1.default.writeFileSync(pptxEmptyPath, '');
        const parser = new pptxParser_1.PptxParser();
        await parser.parse({
            documentId: 'pptx-empty-doc',
            documentType: documentType_1.DocumentType.PPTX,
            filePath: pptxEmptyPath,
            originalFileName: 'test_empty.pptx',
        });
        assert(false, 'Should throw BadRequestError on empty PPTX');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Empty PPTX file'), 'Threw BadRequestError on empty file');
    }
    try {
        fs_1.default.writeFileSync(pptxCorruptedPath, 'Not a zip at all.');
        const parser = new pptxParser_1.PptxParser();
        await parser.parse({
            documentId: 'pptx-corrupt-doc',
            documentType: documentType_1.DocumentType.PPTX,
            filePath: pptxCorruptedPath,
            originalFileName: 'test_corrupted.pptx',
        });
        assert(false, 'Should throw BadRequestError on corrupted PPTX');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Corrupted or invalid PPTX file'), 'Threw BadRequestError on corrupted file');
    }
    // Cleanup files
    try {
        fs_1.default.unlinkSync(pptxValidPath);
        fs_1.default.unlinkSync(pptxEmptyPath);
        fs_1.default.unlinkSync(pptxCorruptedPath);
    }
    catch (_) { }
    console.log('\n--- Phase 7 PPTX Parser Tests Summary ---');
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

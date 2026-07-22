import '../utils/canvasMock';
import fs from 'fs';
import path from 'path';
import { ParserFactory } from '../parsers/factory/parserFactory';
import { DocumentType } from '../types/documentType';
import { DocxParser } from '../parsers/docx/docxParser';
import { HtmlParser } from '../parsers/html/htmlParser';
import { MarkdownParser } from '../parsers/markdown/markdownParser';
import { TxtParser } from '../parsers/txt/txtParser';
import { BadRequestError } from '../utils/errors';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Temporary test file paths
const docxPath = path.join(uploadsDir, 'test.docx'); // Pre-downloaded valid docx
const htmlPath = path.join(uploadsDir, 'test.html');
const mdPath = path.join(uploadsDir, 'test.md');
const txtPath = path.join(uploadsDir, 'test.txt');
const emptyTxtPath = path.join(uploadsDir, 'empty.txt');

// 1. Setup inline mock files
const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Mock HTML Document</title>
  <style>body { color: red; }</style>
</head>
<body>
  <h1>HTML Heading 1</h1>
  <script>alert("hacked");</script>
  <p>This is a paragraph text.</p>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
  <table>
    <tr><th>Header A</th><th>Header B</th></tr>
    <tr><td>Val A1</td><td>Val B1</td></tr>
  </table>
</body>
</html>
`;

const sampleMd = `
# Markdown Heading 1
## Markdown Heading 2

This is a paragraph in markdown.

* Bullet 1
* Bullet 2

\`\`\`javascript
const a = 1;
\`\`\`
`;

const sampleTxt = `
TXT HEADING 1

This is the first paragraph.
It contains two lines.

1.1 TXT HEADING 2

This is the second paragraph.
`;

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

  console.log('\n--- Starting Phase 4 Parser Tests ---');

  // Test 1: Parser Registration & Factory Check
  try {
    assert(ParserFactory.getParser(DocumentType.DOCX) instanceof DocxParser, 'Factory maps DOCX to DocxParser');
    assert(ParserFactory.getParser(DocumentType.HTML) instanceof HtmlParser, 'Factory maps HTML to HtmlParser');
    assert(ParserFactory.getParser(DocumentType.MARKDOWN) instanceof MarkdownParser, 'Factory maps MARKDOWN to MarkdownParser');
    assert(ParserFactory.getParser(DocumentType.TXT) instanceof TxtParser, 'Factory maps TXT to TxtParser');
  } catch (err) {
    assert(false, `Test 1 failed: ${err}`);
  }

  // Test 2: HTML Parser
  try {
    fs.writeFileSync(htmlPath, sampleHtml);
    const parser = new HtmlParser();
    const doc = await parser.parse({
      documentId: 'html-doc',
      documentType: DocumentType.HTML,
      filePath: htmlPath,
      originalFileName: 'test.html',
    });

    assert(doc.metadata.title === 'Mock HTML Document', 'HTML title successfully extracted');
    assert(doc.sections.length === 1, 'HTML sections mapped correctly');
    assert(doc.sections[0]?.title === 'HTML Heading 1', 'HTML heading 1 extracted as section title');

    const content = doc.sections[0]?.content || [];
    assert(content.length === 3, 'HTML content blocks parsed (p, list, table)');

    // Assert script tag was removed
    const hasScript = content.some(c => c.content && typeof c.content === 'string' && c.content.includes('alert'));
    assert(!hasScript, 'HTML script tag content was successfully ignored/removed');

    // Assert list parsing
    const listBlock = content.find(c => c.type === 'list');
    assert(
      listBlock !== undefined && Array.isArray(listBlock.content) && listBlock.content[0] === 'List item 1',
      'HTML list items parsed successfully'
    );

    // Assert table parsing
    const tableBlock = content.find(c => c.type === 'table');
    assert(
      tableBlock !== undefined && tableBlock.content.rows !== undefined && tableBlock.content.rows[1][0] === 'Val A1',
      'HTML table matrix structure preserved'
    );

  } catch (err) {
    assert(false, `HTML Parser failed: ${err}`);
  } finally {
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  }

  // Test 3: Markdown Parser
  try {
    fs.writeFileSync(mdPath, sampleMd);
    const parser = new MarkdownParser();
    const doc = await parser.parse({
      documentId: 'md-doc',
      documentType: DocumentType.MARKDOWN,
      filePath: mdPath,
      originalFileName: 'test.md',
    });

    assert(doc.sections.length === 2, 'Markdown sections (Heading 1 & Heading 2) mapped correctly');
    assert(doc.sections[0]?.title === 'Markdown Heading 1', 'MD heading 1 title parsed');
    assert(doc.sections[0]?.level === 1, 'MD heading 1 level is 1');
    assert(doc.sections[1]?.title === 'Markdown Heading 2', 'MD heading 2 title parsed');
    assert(doc.sections[1]?.level === 2, 'MD heading 2 level is 2');

    const content1 = doc.sections[1]?.content || [];
    assert(content1.find(c => c.type === 'paragraph')?.content === 'This is a paragraph in markdown.', 'MD paragraph text parsed');
    assert(content1.find(c => c.type === 'list')?.content[0] === 'Bullet 1', 'MD bullet list parsed');
    assert(content1.find(c => c.type === 'code_block')?.content.includes('const a = 1;'), 'MD code block parsed');

  } catch (err) {
    assert(false, `Markdown Parser failed: ${err}`);
  } finally {
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  }

  // Test 4: TXT Parser
  try {
    fs.writeFileSync(txtPath, sampleTxt);
    const parser = new TxtParser();
    const doc = await parser.parse({
      documentId: 'txt-doc',
      documentType: DocumentType.TXT,
      filePath: txtPath,
      originalFileName: 'test.txt',
    });

    assert(doc.sections.length === 2, 'TXT sections mapped correctly based on spacing and casing');
    assert(doc.sections[0]?.title === 'TXT HEADING 1', 'TXT heading 1 parsed');
    assert(doc.sections[0]?.level === 1, 'TXT heading 1 level is 1');
    assert(doc.sections[1]?.title === '1.1 TXT HEADING 2', 'TXT heading 2 parsed with number outline');
    assert(doc.sections[1]?.level === 2, 'TXT heading 2 level is 2');

    const content0 = doc.sections[0]?.content || [];
    assert(
      content0[0]?.content === 'This is the first paragraph. It contains two lines.',
      'TXT paragraph text cleaned and wrapped successfully'
    );

  } catch (err) {
    assert(false, `TXT Parser failed: ${err}`);
  } finally {
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
  }

  // Test 5: TXT Empty File Handling
  try {
    fs.writeFileSync(emptyTxtPath, '');
    const parser = new TxtParser();
    await parser.parse({
      documentId: 'empty-txt-doc',
      documentType: DocumentType.TXT,
      filePath: emptyTxtPath,
      originalFileName: 'empty.txt',
    });
    assert(false, 'Parsing an empty TXT file should fail');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('Empty TXT'),
      'Parsing empty TXT file throws BadRequestError'
    );
  } finally {
    if (fs.existsSync(emptyTxtPath)) fs.unlinkSync(emptyTxtPath);
  }

  // Test 6: DOCX Parser
  if (!fs.existsSync(docxPath)) {
    console.log(`[SKIP] - DOCX tests skipped. ${docxPath} is missing.`);
  } else {
    try {
      const parser = new DocxParser();
      const doc = await parser.parse({
        documentId: 'docx-doc',
        documentType: DocumentType.DOCX,
        filePath: docxPath,
        originalFileName: 'test.docx',
      });

      assert(doc.documentType === DocumentType.DOCX, 'DocxParser returns correct documentType');
      assert(doc.sections.length > 0, 'Docx parsed sections are non-empty');

      let hasTable = false;
      for (const section of doc.sections) {
        if (section.content.some(c => c.type === 'table')) {
          hasTable = true;
          break;
        }
      }
      assert(hasTable, 'Docx table elements extracted successfully');

      console.log('\nSample Parsed DOCX Table structure:');
      const tableSection = doc.sections.find(s => s.content.some(c => c.type === 'table'));
      if (tableSection) {
        const tableBlock = tableSection.content.find(c => c.type === 'table');
        console.log(JSON.stringify(tableBlock, null, 2));
      }

    } catch (err) {
      assert(false, `DOCX Parser failed: ${err}`);
    }
  }

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

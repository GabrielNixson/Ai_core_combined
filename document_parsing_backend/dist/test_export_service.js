"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/canvasMock");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const markdownExporter_1 = require("./parsers/exporter/markdownExporter");
const jsonExporter_1 = require("./parsers/exporter/jsonExporter");
const documentExport_service_1 = require("./services/documentExport.service");
const documentType_1 = require("./types/documentType");
const config_1 = require("./config/config");
const mockDoc = {
    documentId: 'doc-export-test-123',
    documentType: documentType_1.DocumentType.TXT,
    metadata: {
        title: 'Installation Guide',
        sourceType: 'TXT',
        author: 'Test Author',
    },
    sections: [
        {
            title: 'Introduction',
            level: 1,
            content: [
                {
                    type: 'paragraph',
                    content: 'This system monitors energy consumption.',
                },
                {
                    type: 'heading',
                    content: 'Wiring Info',
                },
                {
                    type: 'list',
                    content: ['Verify connection', 'Configure device'],
                },
            ],
        },
        {
            title: 'Register Map',
            level: 1,
            content: [
                {
                    type: 'table',
                    content: {
                        columns: ['Address', 'Name'],
                        rows: [{ Address: '40001', Name: 'Voltage' }],
                    },
                },
                {
                    type: 'table',
                    content: {
                        columns: [],
                        rows: [
                            ['Col1', 'Col2'],
                            ['Val1', 'Val2'],
                        ],
                    },
                },
                {
                    type: 'spreadsheet',
                    content: {
                        sheet: 'Sheet1',
                        columns: ['Addr', 'Value'],
                        rows: [{ Addr: { value: 40002, type: 'number' }, Value: { value: 'Current', type: 'string' } }],
                    },
                },
                {
                    type: 'image',
                    content: {
                        fileName: 'diagram.png',
                        width: 1920,
                        height: 1080,
                        ocrStatus: 'NOT_PROCESSED',
                    },
                },
                {
                    type: 'notes',
                    content: 'Keep notes short.',
                },
                {
                    type: 'slide',
                    content: {
                        slideNumber: 5,
                        title: 'Wiring Details',
                    },
                },
                {
                    type: 'json',
                    content: { active: true },
                },
                {
                    type: 'xml',
                    content: '<device id="1">meter</device>',
                },
            ],
        },
    ],
};
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
    console.log('\n--- Starting Phase 9 Export Service Tests ---');
    // Test 1: Markdown Exporter Formatting
    try {
        const exporter = new markdownExporter_1.MarkdownExporter();
        const md = await exporter.export(mockDoc);
        // Assert Frontmatter
        assert(md.includes('---'), 'Markdown has frontmatter block');
        assert(md.includes('documentId: "doc-export-test-123"'), 'Frontmatter contains documentId');
        assert(md.includes('author: "Test Author"'), 'Frontmatter contains custom metadata fields');
        // Assert Headings & Paragraphs
        assert(md.includes('# Introduction'), 'Section Title level 1 mapped to Heading');
        assert(md.includes('This system monitors energy consumption.'), 'Paragraph converted correctly');
        assert(md.includes('## Wiring Info'), 'Subheading mapped to block heading');
        // Assert Lists
        assert(md.includes('- Verify connection\n- Configure device'), 'Lists parsed into GFM bullet lists');
        // Assert Tables (CSV, DOCX, XLSX)
        assert(md.includes('| Address | Name |'), 'CSV table headers generated');
        assert(md.includes('| 40001 | Voltage |'), 'CSV row values mapped');
        assert(md.includes('| Col1 | Col2 |'), 'DOCX matrix table header generated');
        assert(md.includes('| Val1 | Val2 |'), 'DOCX row cell elements mapped');
        assert(md.includes('| Addr | Value |'), 'XLSX spreadsheet headers generated');
        assert(md.includes('| 40002 | Current |'), 'XLSX cell type-value resolved and mapped');
        // Assert Slide, Image, Notes
        assert(md.includes('![Image: diagram.png](diagram.png) [Dimensions: 1920x1080, Status: NOT_PROCESSED]'), 'Image tag parsed successfully');
        assert(md.includes('> **Speaker Notes:** Keep notes short.'), 'Speaker notes blockquote mapped');
        assert(md.includes('<!-- Slide: 5 | Title: Wiring Details -->'), 'Slide metadata block mapped to HTML comments');
        // Assert Code Blocks (JSON & XML)
        assert(md.includes('```json\n{\n  "active": true\n}\n```'), 'JSON blocks formatted as formatted json code block');
        assert(md.includes('```xml\n<device id="1">meter</device>\n```'), 'XML block format matches');
    }
    catch (err) {
        assert(false, `Test 1 (MarkdownExporter Formatting) failed: ${err}`);
    }
    // Test 2: JSON Exporter Pretty-Printing
    try {
        const exporter = new jsonExporter_1.JsonExporter();
        const jsonStr = await exporter.export(mockDoc);
        const parsed = JSON.parse(jsonStr);
        assert(parsed.documentId === 'doc-export-test-123', 'JSON content contains valid documentId');
        assert(jsonStr.includes('  "documentId": "doc-export-test-123"'), 'JSON content pretty-printed with 2-spaces indentation');
    }
    catch (err) {
        assert(false, `Test 2 (JsonExporter Serialization) failed: ${err}`);
    }
    // Test 3: Export Service File Creation & Configurations
    const testDocId = 'export-service-test-doc';
    const mdFilePath = path_1.default.join(config_1.config.uploadsDir, 'markdown', `${testDocId}.md`);
    const jsonFilePath = path_1.default.join(config_1.config.uploadsDir, 'json', `${testDocId}.json`);
    try {
        // Delete files if they already exist
        if (fs_1.default.existsSync(mdFilePath))
            fs_1.default.unlinkSync(mdFilePath);
        if (fs_1.default.existsSync(jsonFilePath))
            fs_1.default.unlinkSync(jsonFilePath);
        const service = new documentExport_service_1.DocumentExportService({
            enableMarkdownExport: true,
            enableJsonExport: true,
        });
        const res = await service.exportDocument(testDocId, mockDoc);
        assert(res.markdownPath === mdFilePath, 'Returned markdown path matches expected file location');
        assert(res.jsonPath === jsonFilePath, 'Returned JSON path matches expected file location');
        assert(fs_1.default.existsSync(mdFilePath), 'Markdown file successfully written to disk');
        assert(fs_1.default.existsSync(jsonFilePath), 'JSON file successfully written to disk');
        const writtenMd = fs_1.default.readFileSync(mdFilePath, 'utf-8');
        assert(writtenMd.includes('documentId: "doc-export-test-123"'), 'Written Markdown content matches');
    }
    catch (err) {
        assert(false, `Test 3 (File Creation) failed: ${err}`);
    }
    // Test 4: Export Service Disabling flags
    try {
        if (fs_1.default.existsSync(mdFilePath))
            fs_1.default.unlinkSync(mdFilePath);
        if (fs_1.default.existsSync(jsonFilePath))
            fs_1.default.unlinkSync(jsonFilePath);
        const service = new documentExport_service_1.DocumentExportService({
            enableMarkdownExport: false,
            enableJsonExport: false,
        });
        const res = await service.exportDocument(testDocId, mockDoc);
        assert(res.markdownPath === undefined, 'No markdown path returned when disabled');
        assert(res.jsonPath === undefined, 'No json path returned when disabled');
        assert(!fs_1.default.existsSync(mdFilePath), 'No markdown file written when disabled');
        assert(!fs_1.default.existsSync(jsonFilePath), 'No JSON file written when disabled');
    }
    catch (err) {
        assert(false, `Test 4 (Disabling Exports) failed: ${err}`);
    }
    // Clean up
    try {
        if (fs_1.default.existsSync(mdFilePath))
            fs_1.default.unlinkSync(mdFilePath);
        if (fs_1.default.existsSync(jsonFilePath))
            fs_1.default.unlinkSync(jsonFilePath);
    }
    catch (_) { }
    console.log('\n--- Phase 9 Export Service Tests Summary ---');
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

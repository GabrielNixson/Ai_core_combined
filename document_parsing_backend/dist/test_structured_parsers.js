"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/canvasMock");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parserFactory_1 = require("./parsers/factory/parserFactory");
const documentType_1 = require("./types/documentType");
const jsonParser_1 = require("./parsers/json/jsonParser");
const xmlParser_1 = require("./parsers/xml/xmlParser");
const errors_1 = require("./utils/errors");
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Temporary test file paths
const jsonSimplePath = path_1.default.join(uploadsDir, 'test_simple.json');
const jsonNestedPath = path_1.default.join(uploadsDir, 'test_nested.json');
const jsonArrayPath = path_1.default.join(uploadsDir, 'test_array.json');
const jsonInvalidPath = path_1.default.join(uploadsDir, 'test_invalid.json');
const xmlSimplePath = path_1.default.join(uploadsDir, 'test_simple.xml');
const xmlNestedPath = path_1.default.join(uploadsDir, 'test_nested.xml');
const xmlAttributesPath = path_1.default.join(uploadsDir, 'test_attributes.xml');
const xmlRepeatedPath = path_1.default.join(uploadsDir, 'test_repeated.xml');
const xmlInvalidPath = path_1.default.join(uploadsDir, 'test_invalid.xml');
// Payloads
const jsonSimplePayload = JSON.stringify({
    name: 'Energy Meter',
    model: 'EM-100',
    version: 1.2,
});
const jsonNestedPayload = JSON.stringify({
    device: {
        name: 'Energy Meter',
        model: 'EM-100',
        configuration: {
            voltage: 230,
            current: 10,
        },
    },
});
const jsonArrayPayload = JSON.stringify({
    registers: [
        { address: 40001, name: 'Voltage' },
        { address: 40002, name: 'Current' },
    ],
});
const jsonInvalidPayload = `{ "name": "Energy Meter", "model": "EM-100", `;
const xmlSimplePayload = `
<device>
  <name>Energy Meter</name>
  <model>EM-100</model>
</device>
`;
const xmlNestedPayload = `
<device>
  <name>Energy Meter</name>
  <configuration>
    <voltage>230</voltage>
  </configuration>
</device>
`;
const xmlAttributesPayload = `
<device id="101">
  <register address="40001">Voltage</register>
</device>
`;
const xmlRepeatedPayload = `
<registers>
  <register>Voltage</register>
  <register>Current</register>
</registers>
`;
const xmlInvalidPayload = `
<device>
  <name>Energy Meter</name>
  <model>EM-100
</device>
`;
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
    console.log('\n--- Starting Phase 5 Structured Parser Tests ---');
    // Test 1: Parser Registration & Factory Check
    try {
        assert(parserFactory_1.ParserFactory.getParser(documentType_1.DocumentType.JSON) instanceof jsonParser_1.JsonParser, 'Factory maps JSON to JsonParser');
        assert(parserFactory_1.ParserFactory.getParser(documentType_1.DocumentType.XML) instanceof xmlParser_1.XmlParser, 'Factory maps XML to XmlParser');
    }
    catch (err) {
        assert(false, `Test 1 (Factory Registration) failed: ${err}`);
    }
    // Test 2: JSON Parser - Simple Object
    try {
        fs_1.default.writeFileSync(jsonSimplePath, jsonSimplePayload);
        const parser = new jsonParser_1.JsonParser();
        const doc = await parser.parse({
            documentId: 'json-simple-doc',
            documentType: documentType_1.DocumentType.JSON,
            filePath: jsonSimplePath,
            originalFileName: 'test_simple.json',
        });
        assert(doc.documentType === documentType_1.DocumentType.JSON, 'DocumentType is JSON');
        assert(doc.metadata.sourceType === 'JSON', 'metadata.sourceType is JSON');
        assert(doc.metadata.objectCount === 1, 'objectCount is 1');
        assert(doc.metadata.keysCount === 3, 'keysCount is 3');
        assert(doc.sections.length === 1, 'Contains 1 section');
        assert(doc.sections[0]?.title === 'test_simple', 'Root section title matches filename');
        assert(doc.sections[0]?.content[0]?.type === 'json', 'ContentBlock type is json');
        assert(doc.sections[0]?.content[0]?.content.name === 'Energy Meter', 'Extracted simple string value');
    }
    catch (err) {
        assert(false, `Test 2 (JSON Simple) failed: ${err}`);
    }
    // Test 3: JSON Parser - Nested Object
    try {
        fs_1.default.writeFileSync(jsonNestedPath, jsonNestedPayload);
        const parser = new jsonParser_1.JsonParser();
        const doc = await parser.parse({
            documentId: 'json-nested-doc',
            documentType: documentType_1.DocumentType.JSON,
            filePath: jsonNestedPath,
            originalFileName: 'test_nested.json',
        });
        assert(doc.metadata.objectCount === 3, 'objectCount is 3 (root, device, configuration)');
        assert(doc.metadata.keysCount === 6, 'keysCount is 6');
        // device (level 1), configuration (level 2)
        assert(doc.sections.length === 2, 'Parsed nested sections (2 sections total)');
        assert(doc.sections[0]?.title === 'device', 'First section matches unwrapped single root key');
        assert(doc.sections[0]?.level === 1, 'First section level is 1');
        assert(doc.sections[1]?.title === 'configuration', 'Second section is configuration');
        assert(doc.sections[1]?.level === 2, 'Second section level is 2');
        assert(doc.sections[1]?.content[0]?.content.voltage === 230, 'Voltage parsed as number');
    }
    catch (err) {
        assert(false, `Test 3 (JSON Nested) failed: ${err}`);
    }
    // Test 4: JSON Parser - Array Handling
    try {
        fs_1.default.writeFileSync(jsonArrayPath, jsonArrayPayload);
        const parser = new jsonParser_1.JsonParser();
        const doc = await parser.parse({
            documentId: 'json-array-doc',
            documentType: documentType_1.DocumentType.JSON,
            filePath: jsonArrayPath,
            originalFileName: 'test_array.json',
        });
        assert(doc.sections.length === 1, 'Parsed 1 section');
        assert(doc.sections[0]?.title === 'registers', 'Section title is registers');
        assert(doc.sections[0]?.content[0]?.type === 'json-array', 'ContentBlock type is json-array');
        assert(Array.isArray(doc.sections[0]?.content[0]?.content), 'Content payload is an array');
        assert(doc.sections[0]?.content[0]?.content[0].address === 40001, 'Array first object address matches');
    }
    catch (err) {
        assert(false, `Test 4 (JSON Array) failed: ${err}`);
    }
    // Test 5: JSON Parser - Invalid JSON
    try {
        fs_1.default.writeFileSync(jsonInvalidPath, jsonInvalidPayload);
        const parser = new jsonParser_1.JsonParser();
        await parser.parse({
            documentId: 'json-invalid-doc',
            documentType: documentType_1.DocumentType.JSON,
            filePath: jsonInvalidPath,
            originalFileName: 'test_invalid.json',
        });
        assert(false, 'Should throw BadRequestError for invalid JSON');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Invalid JSON syntax'), `Correctly threw BadRequestError for invalid JSON syntax: "${err.message}"`);
    }
    // Test 6: XML Parser - Simple XML
    try {
        fs_1.default.writeFileSync(xmlSimplePath, xmlSimplePayload);
        const parser = new xmlParser_1.XmlParser();
        const doc = await parser.parse({
            documentId: 'xml-simple-doc',
            documentType: documentType_1.DocumentType.XML,
            filePath: xmlSimplePath,
            originalFileName: 'test_simple.xml',
        });
        assert(doc.documentType === documentType_1.DocumentType.XML, 'DocumentType is XML');
        assert(doc.metadata.sourceType === 'XML', 'metadata.sourceType is XML');
        assert(doc.metadata.elementCount === 3, 'elementCount is 3 (device, name, model)');
        assert(doc.metadata.attributeCount === 0, 'attributeCount is 0');
        assert(doc.sections.length === 1, 'Contains 1 section');
        assert(doc.sections[0]?.title === 'device', 'Root section title matches root node tag name');
        assert(doc.sections[0]?.content[0]?.type === 'xml', 'ContentBlock type is xml');
        assert(doc.sections[0]?.content[0]?.content.name === 'Energy Meter', 'Parsed child tag value correctly');
    }
    catch (err) {
        assert(false, `Test 6 (XML Simple) failed: ${err}`);
    }
    // Test 7: XML Parser - Nested XML
    try {
        fs_1.default.writeFileSync(xmlNestedPath, xmlNestedPayload);
        const parser = new xmlParser_1.XmlParser();
        const doc = await parser.parse({
            documentId: 'xml-nested-doc',
            documentType: documentType_1.DocumentType.XML,
            filePath: xmlNestedPath,
            originalFileName: 'test_nested.xml',
        });
        // device (level 1), configuration (level 2)
        assert(doc.sections.length === 2, 'Parsed nested sections (2 sections total)');
        assert(doc.sections[0]?.title === 'device', 'First section is device');
        assert(doc.sections[0]?.level === 1, 'First section level is 1');
        assert(doc.sections[1]?.title === 'configuration', 'Second section is configuration');
        assert(doc.sections[1]?.level === 2, 'Second section level is 2');
        assert(doc.sections[1]?.content[0]?.content.voltage === 230, 'Voltage parsed as number');
    }
    catch (err) {
        assert(false, `Test 7 (XML Nested) failed: ${err}`);
    }
    // Test 8: XML Parser - Attributes Preservation
    try {
        fs_1.default.writeFileSync(xmlAttributesPath, xmlAttributesPayload);
        const parser = new xmlParser_1.XmlParser();
        const doc = await parser.parse({
            documentId: 'xml-attributes-doc',
            documentType: documentType_1.DocumentType.XML,
            filePath: xmlAttributesPath,
            originalFileName: 'test_attributes.xml',
        });
        assert(doc.metadata.attributeCount === 2, 'attributeCount is 2');
        assert(doc.sections[0]?.title === 'device', 'Section title is device');
        assert(doc.sections[0]?.content[0]?.content.attributes.id === '101', 'Preserved root node attributes in ContentBlock');
        assert(doc.sections[0]?.content[0]?.content.register.attributes.address === '40001', 'Preserved child node attributes in ContentBlock');
        assert(doc.sections[0]?.content[0]?.content.register.value === 'Voltage', 'Preserved child value in ContentBlock');
    }
    catch (err) {
        assert(false, `Test 8 (XML Attributes) failed: ${err}`);
    }
    // Test 9: XML Parser - Repeated nodes (arrays)
    try {
        fs_1.default.writeFileSync(xmlRepeatedPath, xmlRepeatedPayload);
        const parser = new xmlParser_1.XmlParser();
        const doc = await parser.parse({
            documentId: 'xml-repeated-doc',
            documentType: documentType_1.DocumentType.XML,
            filePath: xmlRepeatedPath,
            originalFileName: 'test_repeated.xml',
        });
        assert(doc.sections.length === 1, 'Parsed 1 section');
        assert(doc.sections[0]?.title === 'registers', 'Section title is registers');
        assert(doc.sections[0]?.content[0]?.type === 'xml-array', 'ContentBlock type is xml-array');
        assert(Array.isArray(doc.sections[0]?.content[0]?.content), 'Content payload is an array');
        assert(doc.sections[0]?.content[0]?.content.length === 2, 'Array size is 2');
        assert(doc.sections[0]?.content[0]?.content[0] === 'Voltage', 'First element string matches');
    }
    catch (err) {
        assert(false, `Test 9 (XML Repeated) failed: ${err}`);
    }
    // Test 10: XML Parser - Invalid XML
    try {
        fs_1.default.writeFileSync(xmlInvalidPath, xmlInvalidPayload);
        const parser = new xmlParser_1.XmlParser();
        await parser.parse({
            documentId: 'xml-invalid-doc',
            documentType: documentType_1.DocumentType.XML,
            filePath: xmlInvalidPath,
            originalFileName: 'test_invalid.xml',
        });
        assert(false, 'Should throw BadRequestError for invalid XML');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError, `Correctly threw BadRequestError for invalid XML syntax/unclosed tags: "${err.message}"`);
    }
    // Cleanup files
    try {
        fs_1.default.unlinkSync(jsonSimplePath);
        fs_1.default.unlinkSync(jsonNestedPath);
        fs_1.default.unlinkSync(jsonArrayPath);
        fs_1.default.unlinkSync(jsonInvalidPath);
        fs_1.default.unlinkSync(xmlSimplePath);
        fs_1.default.unlinkSync(xmlNestedPath);
        fs_1.default.unlinkSync(xmlAttributesPath);
        fs_1.default.unlinkSync(xmlRepeatedPath);
        fs_1.default.unlinkSync(xmlInvalidPath);
    }
    catch (_) { }
    console.log('\n--- Phase 5 Structured Parser Tests Summary ---');
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

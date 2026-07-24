"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../utils/canvasMock");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const XLSX = __importStar(require("xlsx"));
const parserFactory_1 = require("../parsers/factory/parserFactory");
const documentType_1 = require("../types/documentType");
const csvParser_1 = require("../parsers/csv/csvParser");
const xlsxParser_1 = require("../parsers/xlsx/xlsxParser");
const errors_1 = require("../utils/errors");
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Temporary test file paths
const csvCommaPath = path_1.default.join(uploadsDir, 'test_comma.csv');
const csvSemicolonPath = path_1.default.join(uploadsDir, 'test_semicolon.csv');
const csvTabPath = path_1.default.join(uploadsDir, 'test_tab.csv');
const csvMissingPath = path_1.default.join(uploadsDir, 'test_missing.csv');
const csvEmptyPath = path_1.default.join(uploadsDir, 'test_empty.csv');
const csvInvalidPath = path_1.default.join(uploadsDir, 'test_invalid.csv');
const xlsxSinglePath = path_1.default.join(uploadsDir, 'test_single.xlsx');
const xlsxMultiPath = path_1.default.join(uploadsDir, 'test_multi.xlsx');
const xlsxTypesPath = path_1.default.join(uploadsDir, 'test_types.xlsx');
const xlsxEmptyPath = path_1.default.join(uploadsDir, 'test_empty.xlsx');
const xlsxCorruptedPath = path_1.default.join(uploadsDir, 'test_corrupted.xlsx');
// CSV Payloads
const csvCommaPayload = `Address,Name,Unit
40001,Voltage,V
40002,Current,A`;
const csvSemicolonPayload = `Address;Name;Unit
40001;Voltage;V
40002;Current;A`;
const csvTabPayload = `Address\tName\tUnit
40001\tVoltage\tV
40002\tCurrent\tA`;
const csvMissingPayload = `Address,Name,Unit
40001,,V
40002,Current`;
const csvInvalidPayload = `Address,Name,"Unit
40001,Voltage,V`; // Mismatched quotes (breaks parser)
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
    console.log('\n--- Starting Phase 6 Spreadsheet Parser Tests ---');
    // Test 1: Parser Registration & Factory Check
    try {
        assert(parserFactory_1.ParserFactory.getParser(documentType_1.DocumentType.CSV) instanceof csvParser_1.CsvParser, 'Factory maps CSV to CsvParser');
        assert(parserFactory_1.ParserFactory.getParser(documentType_1.DocumentType.XLSX) instanceof xlsxParser_1.XlsxParser, 'Factory maps XLSX to XlsxParser');
    }
    catch (err) {
        assert(false, `Test 1 (Factory Registration) failed: ${err}`);
    }
    // Test 2: CSV Parser - Comma Delimited & Basic Parsing
    try {
        fs_1.default.writeFileSync(csvCommaPath, csvCommaPayload);
        const parser = new csvParser_1.CsvParser();
        const doc = await parser.parse({
            documentId: 'csv-comma-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvCommaPath,
            originalFileName: 'test_comma.csv',
        });
        assert(doc.documentType === documentType_1.DocumentType.CSV, 'DocumentType is CSV');
        assert(doc.metadata.sourceType === 'CSV', 'metadata.sourceType is CSV');
        assert(doc.metadata.rowCount === 2, 'rowCount is 2');
        assert(doc.sections.length === 1, 'Contains 1 section');
        assert(doc.sections[0]?.title === 'CSV Data', 'Section title is "CSV Data"');
        const tableContent = doc.sections[0]?.content[0]?.content;
        assert(tableContent.columns.length === 3, 'columns count is 3');
        assert(tableContent.columns[0] === 'Address', 'First column is Address');
        assert(tableContent.rows.length === 2, 'rows count is 2');
        assert(tableContent.rows[0].Address === '40001', 'Address matches');
        assert(tableContent.rows[0].Name === 'Voltage', 'Name matches');
        assert(tableContent.rows[0].Unit === 'V', 'Unit matches');
    }
    catch (err) {
        assert(false, `Test 2 (CSV Comma) failed: ${err}`);
    }
    // Test 3: CSV Parser - Delimiter Auto-Detection (Semicolon & Tab)
    try {
        fs_1.default.writeFileSync(csvSemicolonPath, csvSemicolonPayload);
        fs_1.default.writeFileSync(csvTabPath, csvTabPayload);
        const parser = new csvParser_1.CsvParser();
        const docSemi = await parser.parse({
            documentId: 'csv-semi-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvSemicolonPath,
            originalFileName: 'test_semicolon.csv',
        });
        assert(docSemi.sections[0]?.content[0]?.content.columns.length === 3, 'Semicolon delimited parsed successfully');
        const docTab = await parser.parse({
            documentId: 'csv-tab-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvTabPath,
            originalFileName: 'test_tab.csv',
        });
        assert(docTab.sections[0]?.content[0]?.content.columns.length === 3, 'Tab delimited parsed successfully');
    }
    catch (err) {
        assert(false, `Test 3 (CSV Delimiters) failed: ${err}`);
    }
    // Test 4: CSV Parser - Missing Values
    try {
        fs_1.default.writeFileSync(csvMissingPath, csvMissingPayload);
        const parser = new csvParser_1.CsvParser();
        const doc = await parser.parse({
            documentId: 'csv-missing-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvMissingPath,
            originalFileName: 'test_missing.csv',
        });
        const tableContent = doc.sections[0]?.content[0]?.content;
        assert(tableContent.rows[0].Name === '', 'Missing cell value is padded to empty string');
        assert(tableContent.rows[1].Unit === '', 'Missing row trailing cells padded correctly');
    }
    catch (err) {
        assert(false, `Test 4 (CSV Missing Values) failed: ${err}`);
    }
    // Test 5: CSV Parser - Invalid / Empty Files
    try {
        fs_1.default.writeFileSync(csvEmptyPath, '');
        const parser = new csvParser_1.CsvParser();
        await parser.parse({
            documentId: 'csv-empty-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvEmptyPath,
            originalFileName: 'test_empty.csv',
        });
        assert(false, 'Should throw BadRequestError for empty CSV');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Empty CSV file'), 'Threw BadRequestError on empty CSV');
    }
    try {
        fs_1.default.writeFileSync(csvInvalidPath, csvInvalidPayload);
        const parser = new csvParser_1.CsvParser();
        await parser.parse({
            documentId: 'csv-invalid-doc',
            documentType: documentType_1.DocumentType.CSV,
            filePath: csvInvalidPath,
            originalFileName: 'test_invalid.csv',
        });
        assert(false, 'Should throw BadRequestError for malformed CSV quotes');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Invalid CSV format'), 'Threw BadRequestError on malformed quotes');
    }
    // Test 6: XLSX Parser - Single Sheet
    try {
        const wb = XLSX.utils.book_new();
        const sheetData = [
            ['Address', 'Name', 'Unit'],
            [40001, 'Voltage', 'V'],
            [40002, 'Current', 'A'],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, 'Register Map');
        XLSX.writeFile(wb, xlsxSinglePath);
        const parser = new xlsxParser_1.XlsxParser();
        const doc = await parser.parse({
            documentId: 'xlsx-single-doc',
            documentType: documentType_1.DocumentType.XLSX,
            filePath: xlsxSinglePath,
            originalFileName: 'test_single.xlsx',
        });
        assert(doc.documentType === documentType_1.DocumentType.XLSX, 'DocumentType is XLSX');
        assert(doc.metadata.sourceType === 'XLSX', 'metadata.sourceType is XLSX');
        assert(doc.metadata.sheetCount === 1, 'sheetCount is 1');
        assert(doc.metadata.rowCount === 2, 'rowCount is 2');
        assert(doc.sections.length === 1, 'Sections array has 1 sheet section');
        assert(doc.sections[0]?.title === 'Register Map', 'Section title is Sheet Name');
        const spreadsheetContent = doc.sections[0]?.content[0]?.content;
        assert(spreadsheetContent.sheet === 'Register Map', 'sheet key is correct');
        assert(spreadsheetContent.columns.length === 3, 'columns count is 3');
        assert(spreadsheetContent.rows.length === 2, 'rows count is 2');
        // Check cell type preservation
        assert(spreadsheetContent.rows[0].Address.value === 40001, 'Preserved cell numeric value');
        assert(spreadsheetContent.rows[0].Address.type === 'number', 'Preserved cell type number');
        assert(spreadsheetContent.rows[0].Name.value === 'Voltage', 'Preserved cell string value');
        assert(spreadsheetContent.rows[0].Name.type === 'string', 'Preserved cell type string');
    }
    catch (err) {
        assert(false, `Test 6 (XLSX Single Sheet) failed: ${err}`);
    }
    // Test 7: XLSX Parser - Multiple Sheets
    try {
        const wb = XLSX.utils.book_new();
        const regData = [
            ['Address', 'Name'],
            [40001, 'Voltage'],
        ];
        const alarmData = [
            ['AlarmID', 'Severity'],
            ['ALM_001', 'Critical'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(regData), 'Registers');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alarmData), 'Alarms');
        XLSX.writeFile(wb, xlsxMultiPath);
        const parser = new xlsxParser_1.XlsxParser();
        const doc = await parser.parse({
            documentId: 'xlsx-multi-doc',
            documentType: documentType_1.DocumentType.XLSX,
            filePath: xlsxMultiPath,
            originalFileName: 'test_multi.xlsx',
        });
        assert(doc.metadata.sheetCount === 2, 'sheetCount is 2');
        assert(doc.metadata.rowCount === 2, 'Total rowCount is 2');
        assert(doc.sections.length === 2, 'Contains 2 separate sections');
        assert(doc.sections[0]?.title === 'Registers', 'Section 1 title is Registers');
        assert(doc.sections[1]?.title === 'Alarms', 'Section 2 title is Alarms');
        const regSheet = doc.sections[0]?.content[0]?.content;
        const alarmSheet = doc.sections[1]?.content[0]?.content;
        assert(regSheet.columns[0] === 'Address', 'First sheet columns parsed');
        assert(alarmSheet.columns[0] === 'AlarmID', 'Second sheet columns parsed');
    }
    catch (err) {
        assert(false, `Test 7 (XLSX Multi Sheets) failed: ${err}`);
    }
    // Test 8: XLSX Parser - Cell Type Handling (Date, Boolean)
    try {
        const wb = XLSX.utils.book_new();
        const testDate = new Date(2026, 6, 16);
        const data = [
            ['BoolVal', 'DateVal', 'StringVal'],
            [true, testDate, 'Testing'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Types');
        XLSX.writeFile(wb, xlsxTypesPath);
        const parser = new xlsxParser_1.XlsxParser();
        const doc = await parser.parse({
            documentId: 'xlsx-types-doc',
            documentType: documentType_1.DocumentType.XLSX,
            filePath: xlsxTypesPath,
            originalFileName: 'test_types.xlsx',
        });
        const sheet = doc.sections[0]?.content[0]?.content;
        assert(sheet.rows[0].BoolVal.value === true, 'Preserved cell boolean value');
        assert(sheet.rows[0].BoolVal.type === 'boolean', 'Preserved cell type boolean');
        assert(sheet.rows[0].DateVal.value instanceof Date, 'Preserved cell date value');
        assert(sheet.rows[0].DateVal.type === 'date', 'Preserved cell type date');
        assert(sheet.rows[0].StringVal.type === 'string', 'Preserved cell type string');
    }
    catch (err) {
        assert(false, `Test 8 (XLSX Cell Types) failed: ${err}`);
    }
    // Test 9: XLSX Parser - Corrupted or Empty Workbook
    try {
        fs_1.default.writeFileSync(xlsxEmptyPath, '');
        const parser = new xlsxParser_1.XlsxParser();
        await parser.parse({
            documentId: 'xlsx-empty-doc',
            documentType: documentType_1.DocumentType.XLSX,
            filePath: xlsxEmptyPath,
            originalFileName: 'test_empty.xlsx',
        });
        assert(false, 'Should throw BadRequestError for empty XLSX');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError, 'Threw BadRequestError on empty XLSX file');
    }
    try {
        fs_1.default.writeFileSync(xlsxCorruptedPath, 'This is not a zip or excel file at all.');
        const parser = new xlsxParser_1.XlsxParser();
        await parser.parse({
            documentId: 'xlsx-corrupt-doc',
            documentType: documentType_1.DocumentType.XLSX,
            filePath: xlsxCorruptedPath,
            originalFileName: 'test_corrupted.xlsx',
        });
        assert(false, 'Should throw BadRequestError for corrupted XLSX');
    }
    catch (err) {
        assert(err instanceof errors_1.BadRequestError && err.message.includes('Corrupted or invalid XLSX workbook'), 'Threw BadRequestError on corrupted XLSX');
    }
    // Cleanup files
    try {
        fs_1.default.unlinkSync(csvCommaPath);
        fs_1.default.unlinkSync(csvSemicolonPath);
        fs_1.default.unlinkSync(csvTabPath);
        fs_1.default.unlinkSync(csvMissingPath);
        fs_1.default.unlinkSync(csvEmptyPath);
        fs_1.default.unlinkSync(csvInvalidPath);
        fs_1.default.unlinkSync(xlsxSinglePath);
        fs_1.default.unlinkSync(xlsxMultiPath);
        fs_1.default.unlinkSync(xlsxTypesPath);
        fs_1.default.unlinkSync(xlsxEmptyPath);
        fs_1.default.unlinkSync(xlsxCorruptedPath);
    }
    catch (_) { }
    console.log('\n--- Phase 6 Spreadsheet Parser Tests Summary ---');
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

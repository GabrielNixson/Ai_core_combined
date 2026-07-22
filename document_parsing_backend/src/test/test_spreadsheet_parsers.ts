import '../utils/canvasMock';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { ParserFactory } from '../parsers/factory/parserFactory';
import { DocumentType } from '../types/documentType';
import { CsvParser } from '../parsers/csv/csvParser';
import { XlsxParser } from '../parsers/xlsx/xlsxParser';
import { BadRequestError } from '../utils/errors';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Temporary test file paths
const csvCommaPath = path.join(uploadsDir, 'test_comma.csv');
const csvSemicolonPath = path.join(uploadsDir, 'test_semicolon.csv');
const csvTabPath = path.join(uploadsDir, 'test_tab.csv');
const csvMissingPath = path.join(uploadsDir, 'test_missing.csv');
const csvEmptyPath = path.join(uploadsDir, 'test_empty.csv');
const csvInvalidPath = path.join(uploadsDir, 'test_invalid.csv');

const xlsxSinglePath = path.join(uploadsDir, 'test_single.xlsx');
const xlsxMultiPath = path.join(uploadsDir, 'test_multi.xlsx');
const xlsxTypesPath = path.join(uploadsDir, 'test_types.xlsx');
const xlsxEmptyPath = path.join(uploadsDir, 'test_empty.xlsx');
const xlsxCorruptedPath = path.join(uploadsDir, 'test_corrupted.xlsx');

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

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`[PASS] - ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] - ${message}`);
      failed++;
    }
  };

  console.log('\n--- Starting Phase 6 Spreadsheet Parser Tests ---');

  // Test 1: Parser Registration & Factory Check
  try {
    assert(
      ParserFactory.getParser(DocumentType.CSV) instanceof CsvParser,
      'Factory maps CSV to CsvParser'
    );
    assert(
      ParserFactory.getParser(DocumentType.XLSX) instanceof XlsxParser,
      'Factory maps XLSX to XlsxParser'
    );
  } catch (err) {
    assert(false, `Test 1 (Factory Registration) failed: ${err}`);
  }

  // Test 2: CSV Parser - Comma Delimited & Basic Parsing
  try {
    fs.writeFileSync(csvCommaPath, csvCommaPayload);
    const parser = new CsvParser();
    const doc = await parser.parse({
      documentId: 'csv-comma-doc',
      documentType: DocumentType.CSV,
      filePath: csvCommaPath,
      originalFileName: 'test_comma.csv',
    });

    assert(doc.documentType === DocumentType.CSV, 'DocumentType is CSV');
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
  } catch (err) {
    assert(false, `Test 2 (CSV Comma) failed: ${err}`);
  }

  // Test 3: CSV Parser - Delimiter Auto-Detection (Semicolon & Tab)
  try {
    fs.writeFileSync(csvSemicolonPath, csvSemicolonPayload);
    fs.writeFileSync(csvTabPath, csvTabPayload);
    const parser = new CsvParser();

    const docSemi = await parser.parse({
      documentId: 'csv-semi-doc',
      documentType: DocumentType.CSV,
      filePath: csvSemicolonPath,
      originalFileName: 'test_semicolon.csv',
    });
    assert(docSemi.sections[0]?.content[0]?.content.columns.length === 3, 'Semicolon delimited parsed successfully');

    const docTab = await parser.parse({
      documentId: 'csv-tab-doc',
      documentType: DocumentType.CSV,
      filePath: csvTabPath,
      originalFileName: 'test_tab.csv',
    });
    assert(docTab.sections[0]?.content[0]?.content.columns.length === 3, 'Tab delimited parsed successfully');
  } catch (err) {
    assert(false, `Test 3 (CSV Delimiters) failed: ${err}`);
  }

  // Test 4: CSV Parser - Missing Values
  try {
    fs.writeFileSync(csvMissingPath, csvMissingPayload);
    const parser = new CsvParser();
    const doc = await parser.parse({
      documentId: 'csv-missing-doc',
      documentType: DocumentType.CSV,
      filePath: csvMissingPath,
      originalFileName: 'test_missing.csv',
    });

    const tableContent = doc.sections[0]?.content[0]?.content;
    assert(tableContent.rows[0].Name === '', 'Missing cell value is padded to empty string');
    assert(tableContent.rows[1].Unit === '', 'Missing row trailing cells padded correctly');
  } catch (err) {
    assert(false, `Test 4 (CSV Missing Values) failed: ${err}`);
  }

  // Test 5: CSV Parser - Invalid / Empty Files
  try {
    fs.writeFileSync(csvEmptyPath, '');
    const parser = new CsvParser();
    await parser.parse({
      documentId: 'csv-empty-doc',
      documentType: DocumentType.CSV,
      filePath: csvEmptyPath,
      originalFileName: 'test_empty.csv',
    });
    assert(false, 'Should throw BadRequestError for empty CSV');
  } catch (err: any) {
    assert(err instanceof BadRequestError && err.message.includes('Empty CSV file'), 'Threw BadRequestError on empty CSV');
  }

  try {
    fs.writeFileSync(csvInvalidPath, csvInvalidPayload);
    const parser = new CsvParser();
    await parser.parse({
      documentId: 'csv-invalid-doc',
      documentType: DocumentType.CSV,
      filePath: csvInvalidPath,
      originalFileName: 'test_invalid.csv',
    });
    assert(false, 'Should throw BadRequestError for malformed CSV quotes');
  } catch (err: any) {
    assert(err instanceof BadRequestError && err.message.includes('Invalid CSV format'), 'Threw BadRequestError on malformed quotes');
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

    const parser = new XlsxParser();
    const doc = await parser.parse({
      documentId: 'xlsx-single-doc',
      documentType: DocumentType.XLSX,
      filePath: xlsxSinglePath,
      originalFileName: 'test_single.xlsx',
    });

    assert(doc.documentType === DocumentType.XLSX, 'DocumentType is XLSX');
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
  } catch (err) {
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

    const parser = new XlsxParser();
    const doc = await parser.parse({
      documentId: 'xlsx-multi-doc',
      documentType: DocumentType.XLSX,
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
  } catch (err) {
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

    const parser = new XlsxParser();
    const doc = await parser.parse({
      documentId: 'xlsx-types-doc',
      documentType: DocumentType.XLSX,
      filePath: xlsxTypesPath,
      originalFileName: 'test_types.xlsx',
    });

    const sheet = doc.sections[0]?.content[0]?.content;
    assert(sheet.rows[0].BoolVal.value === true, 'Preserved cell boolean value');
    assert(sheet.rows[0].BoolVal.type === 'boolean', 'Preserved cell type boolean');
    assert(sheet.rows[0].DateVal.value instanceof Date, 'Preserved cell date value');
    assert(sheet.rows[0].DateVal.type === 'date', 'Preserved cell type date');
    assert(sheet.rows[0].StringVal.type === 'string', 'Preserved cell type string');
  } catch (err) {
    assert(false, `Test 8 (XLSX Cell Types) failed: ${err}`);
  }

  // Test 9: XLSX Parser - Corrupted or Empty Workbook
  try {
    fs.writeFileSync(xlsxEmptyPath, '');
    const parser = new XlsxParser();
    await parser.parse({
      documentId: 'xlsx-empty-doc',
      documentType: DocumentType.XLSX,
      filePath: xlsxEmptyPath,
      originalFileName: 'test_empty.xlsx',
    });
    assert(false, 'Should throw BadRequestError for empty XLSX');
  } catch (err: any) {
    assert(err instanceof BadRequestError, 'Threw BadRequestError on empty XLSX file');
  }

  try {
    fs.writeFileSync(xlsxCorruptedPath, 'This is not a zip or excel file at all.');
    const parser = new XlsxParser();
    await parser.parse({
      documentId: 'xlsx-corrupt-doc',
      documentType: DocumentType.XLSX,
      filePath: xlsxCorruptedPath,
      originalFileName: 'test_corrupted.xlsx',
    });
    assert(false, 'Should throw BadRequestError for corrupted XLSX');
  } catch (err: any) {
    assert(
      err instanceof BadRequestError && err.message.includes('Corrupted or invalid XLSX workbook'),
      'Threw BadRequestError on corrupted XLSX'
    );
  }

  // Cleanup files
  try {
    fs.unlinkSync(csvCommaPath);
    fs.unlinkSync(csvSemicolonPath);
    fs.unlinkSync(csvTabPath);
    fs.unlinkSync(csvMissingPath);
    fs.unlinkSync(csvEmptyPath);
    fs.unlinkSync(csvInvalidPath);
    fs.unlinkSync(xlsxSinglePath);
    fs.unlinkSync(xlsxMultiPath);
    fs.unlinkSync(xlsxTypesPath);
    fs.unlinkSync(xlsxEmptyPath);
    fs.unlinkSync(xlsxCorruptedPath);
  } catch (_) { }

  console.log('\n--- Phase 6 Spreadsheet Parser Tests Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

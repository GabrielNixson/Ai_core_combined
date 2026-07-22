import * as XLSX from 'xlsx';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument, DocumentSection } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { SpreadsheetNormalizer } from '../common/spreadsheetNormalizer';

export class XlsxParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.XLSX;
  }

  /**
   * Reads an XLSX workbook, walks all sheets, extracts structured cell data, and maps to a ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);

    if (buffer.length === 0) {
      throw new BadRequestError('Empty XLSX file.');
    }

    // Verify magic numbers for XLSX (ZIP container) or legacy XLS (OLE2 compound file)
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    const isLegacy = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;

    if (!isZip && !isLegacy) {
      throw new BadRequestError('Corrupted or invalid XLSX workbook: Invalid header signature.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true, // Parse numeric Excel date representations to native JS Dates
        cellNF: false,   // Optimize memory footprint by omitting cell formatting fields
        cellText: false, // Optimize memory footprint by omitting formatted text strings
      });
    } catch (err: any) {
      throw new BadRequestError(`Corrupted or invalid XLSX workbook: ${err.message}`);
    }

    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      throw new BadRequestError('Invalid XLSX workbook: No sheets found.');
    }

    const sections: DocumentSection[] = [];
    let totalRowCount = 0;

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Parse sheet to 2D array [row][col] of raw cells
      const sheetData = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        raw: true, // Preserve numbers, booleans, and date types
        defval: null, // Fill empty cells with null to preserve grid dimensions and column offsets
      });

      const normalizedSheet = SpreadsheetNormalizer.normalizeXlsx(sheetData, sheetName);
      totalRowCount += normalizedSheet.rows.length;

      sections.push({
        title: sheetName,
        level: 1,
        content: [
          {
            type: 'spreadsheet',
            content: normalizedSheet,
          },
        ],
      });
    }

    return {
      documentId: context.documentId,
      documentType: DocumentType.XLSX,
      metadata: {
        title: context.originalFileName,
        sourceType: 'XLSX',
        sheetCount: sheetNames.length,
        rowCount: totalRowCount,
        totalPages: 1,
      },
      sections,
    };
  }
}
export default XlsxParser;

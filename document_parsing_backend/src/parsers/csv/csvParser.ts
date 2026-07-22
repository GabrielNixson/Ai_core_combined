import { parse } from 'csv-parse/sync';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { SpreadsheetNormalizer } from '../common/spreadsheetNormalizer';

export class CsvParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.CSV;
  }

  /**
   * Reads a CSV file, detects its delimiter, parses rows, and maps to a ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const rawContent = buffer.toString('utf-8').trim();

    if (rawContent === '') {
      throw new BadRequestError('Empty CSV file.');
    }

    const delimiter = this.detectDelimiter(rawContent);

    let rawRecords: string[][];
    try {
      rawRecords = parse(rawContent, {
        delimiter,
        skip_empty_lines: true,
        relax_column_count: true, // Gracefully handle rows with varying columns
      });
    } catch (err: any) {
      throw new BadRequestError(`Invalid CSV format: ${err.message}`);
    }

    if (rawRecords.length === 0) {
      throw new BadRequestError('Empty CSV contents.');
    }

    const tableContent = SpreadsheetNormalizer.normalizeCsv(rawRecords);
    const rowCount = tableContent.rows.length;

    return {
      documentId: context.documentId,
      documentType: DocumentType.CSV,
      metadata: {
        title: context.originalFileName,
        sourceType: 'CSV',
        rowCount,
        totalPages: 1,
      },
      sections: [
        {
          title: 'CSV Data',
          level: 1,
          content: [
            {
              type: 'table',
              content: tableContent,
            },
          ],
        },
      ],
    };
  }

  /**
   * Scans the first line to auto-detect delimiters (comma, semicolon, or tab).
   */
  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
    };

    let bestDelimiter = ',';
    let maxCount = 0;

    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }
}
export default CsvParser;

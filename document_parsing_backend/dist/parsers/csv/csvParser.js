"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvParser = void 0;
const sync_1 = require("csv-parse/sync");
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const spreadsheetNormalizer_1 = require("../common/spreadsheetNormalizer");
class CsvParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.CSV;
    }
    /**
     * Reads a CSV file, detects its delimiter, parses rows, and maps to a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        const rawContent = buffer.toString('utf-8').trim();
        if (rawContent === '') {
            throw new errors_1.BadRequestError('Empty CSV file.');
        }
        const delimiter = this.detectDelimiter(rawContent);
        let rawRecords;
        try {
            rawRecords = (0, sync_1.parse)(rawContent, {
                delimiter,
                skip_empty_lines: true,
                relax_column_count: true, // Gracefully handle rows with varying columns
            });
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid CSV format: ${err.message}`);
        }
        if (rawRecords.length === 0) {
            throw new errors_1.BadRequestError('Empty CSV contents.');
        }
        const tableContent = spreadsheetNormalizer_1.SpreadsheetNormalizer.normalizeCsv(rawRecords);
        const rowCount = tableContent.rows.length;
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.CSV,
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
    detectDelimiter(content) {
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
exports.CsvParser = CsvParser;
exports.default = CsvParser;

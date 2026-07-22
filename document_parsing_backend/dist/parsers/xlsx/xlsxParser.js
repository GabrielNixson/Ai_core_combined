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
Object.defineProperty(exports, "__esModule", { value: true });
exports.XlsxParser = void 0;
const XLSX = __importStar(require("xlsx"));
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const spreadsheetNormalizer_1 = require("../common/spreadsheetNormalizer");
class XlsxParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.XLSX;
    }
    /**
     * Reads an XLSX workbook, walks all sheets, extracts structured cell data, and maps to a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty XLSX file.');
        }
        // Verify magic numbers for XLSX (ZIP container) or legacy XLS (OLE2 compound file)
        const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
        const isLegacy = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
        if (!isZip && !isLegacy) {
            throw new errors_1.BadRequestError('Corrupted or invalid XLSX workbook: Invalid header signature.');
        }
        let workbook;
        try {
            workbook = XLSX.read(buffer, {
                type: 'buffer',
                cellDates: true, // Parse numeric Excel date representations to native JS Dates
                cellNF: false, // Optimize memory footprint by omitting cell formatting fields
                cellText: false, // Optimize memory footprint by omitting formatted text strings
            });
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Corrupted or invalid XLSX workbook: ${err.message}`);
        }
        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
            throw new errors_1.BadRequestError('Invalid XLSX workbook: No sheets found.');
        }
        const sections = [];
        let totalRowCount = 0;
        for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet)
                continue;
            // Parse sheet to 2D array [row][col] of raw cells
            const sheetData = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: true, // Preserve numbers, booleans, and date types
                defval: null, // Fill empty cells with null to preserve grid dimensions and column offsets
            });
            const normalizedSheet = spreadsheetNormalizer_1.SpreadsheetNormalizer.normalizeXlsx(sheetData, sheetName);
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
            documentType: documentType_1.DocumentType.XLSX,
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
exports.XlsxParser = XlsxParser;
exports.default = XlsxParser;

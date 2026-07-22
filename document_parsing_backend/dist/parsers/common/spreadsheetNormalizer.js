"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadsheetNormalizer = void 0;
class SpreadsheetNormalizer {
    /**
     * Normalizes raw 2D array from CSV into a structured table content block.
     */
    static normalizeCsv(rawRows) {
        if (rawRows.length === 0) {
            return { columns: [], rows: [] };
        }
        const firstRow = rawRows[0] || [];
        const columns = firstRow.map((col, index) => {
            const trimmed = col.trim();
            return trimmed !== '' ? trimmed : `Column_${index + 1}`;
        });
        const rows = [];
        for (let i = 1; i < rawRows.length; i++) {
            const rowData = rawRows[i] || [];
            const rowObject = {};
            columns.forEach((col, index) => {
                const val = rowData[index];
                rowObject[col] = val !== undefined ? val.trim() : '';
            });
            rows.push(rowObject);
        }
        return { columns, rows };
    }
    /**
     * Normalizes raw 2D array from XLSX sheet into a structured spreadsheet content block.
     */
    static normalizeXlsx(sheetData, sheetName) {
        if (sheetData.length === 0) {
            return { sheet: sheetName, columns: [], rows: [] };
        }
        const firstRow = sheetData[0] || [];
        const columns = firstRow.map((col, index) => {
            const strVal = col !== null && col !== undefined ? String(col).trim() : '';
            return strVal !== '' ? strVal : `Column_${index + 1}`;
        });
        const rows = [];
        for (let i = 1; i < sheetData.length; i++) {
            const rowData = sheetData[i] || [];
            const rowObject = {};
            columns.forEach((col, index) => {
                const rawVal = rowData[index];
                rowObject[col] = this.normalizeCellValue(rawVal);
            });
            rows.push(rowObject);
        }
        return { sheet: sheetName, columns, rows };
    }
    /**
     * Translates raw CellJS value into a structured value and type definition.
     */
    static normalizeCellValue(val) {
        if (val === null || val === undefined) {
            return { value: '', type: 'string' };
        }
        if (val instanceof Date) {
            return { value: val, type: 'date' };
        }
        if (typeof val === 'number') {
            return { value: val, type: 'number' };
        }
        if (typeof val === 'boolean') {
            return { value: val, type: 'boolean' };
        }
        // Default to string
        return { value: String(val).trim(), type: 'string' };
    }
}
exports.SpreadsheetNormalizer = SpreadsheetNormalizer;
exports.default = SpreadsheetNormalizer;

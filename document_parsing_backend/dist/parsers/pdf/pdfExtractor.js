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
exports.PdfExtractor = void 0;
const pdfjsLib = __importStar(require("pdfjs-dist/legacy/build/pdf"));
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class PdfExtractor {
    constructor() {
        // Disable worker for execution inside Node.js single thread
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        }
    }
    /**
     * Extracts raw lines of text page-by-page and parses document metadata.
     */
    async extract(buffer) {
        try {
            // Initialize pdfjs load task
            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buffer),
                useSystemFonts: true,
                disableFontFace: true, // Optimizes loading in Node.js
            });
            const pdfDoc = await loadingTask.promise;
            // Extract general metadata
            const rawMeta = await pdfDoc.getMetadata().catch((err) => {
                logger_1.logger.warn('Failed to extract raw metadata from PDF:', err);
                return null;
            });
            const info = rawMeta?.info;
            const metadata = {
                title: info?.Title || info?.title || '',
                author: info?.Author || info?.author || '',
                totalPages: pdfDoc.numPages,
                creator: info?.Creator || '',
                producer: info?.Producer || '',
                creationDate: info?.CreationDate || '',
            };
            const pages = [];
            // Extract text content page-by-page
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                const items = textContent.items;
                // Group text items by Y-coordinate with a small tolerance (e.g., 3 units)
                const lineGroups = new Map();
                for (const item of items) {
                    if (!item.str || item.str.trim() === '') {
                        continue;
                    }
                    const y = item.transform[5];
                    if (y === undefined) {
                        continue;
                    }
                    // Tolerance grouping
                    const tolerance = 3.0;
                    let matchedY = y;
                    for (const key of lineGroups.keys()) {
                        if (Math.abs(key - y) < tolerance) {
                            matchedY = key;
                            break;
                        }
                    }
                    const group = lineGroups.get(matchedY) || [];
                    group.push(item);
                    lineGroups.set(matchedY, group);
                }
                const pageLines = [];
                // Sort lines from top to bottom (Y coordinate descending in PDF space)
                const sortedYKeys = Array.from(lineGroups.keys()).sort((a, b) => b - a);
                for (const y of sortedYKeys) {
                    const groupItems = lineGroups.get(y) || [];
                    // Sort text items in the same line from left to right (X coordinate ascending)
                    groupItems.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
                    const lineText = groupItems
                        .map((item) => item.str)
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    // Approximate font size as the max vertical scale in the transform matrix (transform[3])
                    const fontSize = Math.max(...groupItems.map((item) => Math.abs(item.transform[3] || 10)));
                    const fontName = groupItems[0]?.fontName || '';
                    if (lineText !== '') {
                        pageLines.push({
                            y,
                            text: lineText,
                            fontSize,
                            fontName,
                            pageNumber: pageNum,
                        });
                    }
                }
                pages.push({
                    pageNumber: pageNum,
                    lines: pageLines,
                });
            }
            return { metadata, pages };
        }
        catch (err) {
            logger_1.logger.error('Error in PdfExtractor during parsing:', err);
            // Handle PDF-specific validation errors
            if (err.name === 'PasswordException') {
                throw new errors_1.BadRequestError('Password-protected PDF files are not supported.');
            }
            if (err.name === 'InvalidPDFException') {
                throw new errors_1.BadRequestError('The file is not a valid PDF or is corrupted.');
            }
            throw err;
        }
    }
}
exports.PdfExtractor = PdfExtractor;
exports.default = PdfExtractor;

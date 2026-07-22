"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxParser = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const documentType_1 = require("../../types/documentType");
const htmlParser_1 = require("../html/htmlParser");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
class DocxParser {
    htmlParser;
    constructor(htmlParser = new htmlParser_1.HtmlParser()) {
        this.htmlParser = htmlParser;
    }
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.DOCX;
    }
    /**
     * Reads and parses a DOCX file using mammoth, mapping structures
     * to clean semantic HTML, and then delegates traversal to HtmlParser.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty DOCX file.');
        }
        try {
            // Mammoth extracts pure clean paragraphs, tables, lists, and headings as HTML tags
            const result = await mammoth_1.default.convertToHtml({ buffer });
            const htmlString = result.value;
            // Parse html output into structured ParsedDocument format
            const parsedDoc = this.htmlParser.parseHtmlString(htmlString, context);
            // Map docx specific document details
            parsedDoc.documentType = documentType_1.DocumentType.DOCX;
            parsedDoc.metadata.sourceType = 'DOCX';
            return parsedDoc;
        }
        catch (error) {
            logger_1.logger.error(`Error parsing DOCX file: ${context.filePath}`, error);
            throw new errors_1.BadRequestError(`Invalid or corrupted DOCX file: ${error.message || String(error)}`);
        }
    }
}
exports.DocxParser = DocxParser;
exports.default = DocxParser;

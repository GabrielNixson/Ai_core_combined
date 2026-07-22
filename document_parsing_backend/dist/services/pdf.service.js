"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const path_1 = __importDefault(require("path"));
const pdfParser_1 = require("../parsers/pdf/pdfParser");
const documentType_1 = require("../types/documentType");
const errors_1 = require("../utils/errors");
class PdfService {
    pdfParser;
    constructor(pdfParser = new pdfParser_1.PdfParser()) {
        this.pdfParser = pdfParser;
    }
    /**
     * Helper method to parse a PDF file directly given its file path and document ID.
     */
    async parsePdfFile(filePath, documentId) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext !== '.pdf') {
            throw new errors_1.BadRequestError(`File extension "${ext}" is not supported by PdfService.`);
        }
        const context = {
            documentId,
            documentType: (0, documentType_1.getDocumentTypeFromExtension)(ext),
            filePath,
            originalFileName: path_1.default.basename(filePath),
        };
        return this.pdfParser.parse(context);
    }
}
exports.PdfService = PdfService;
exports.default = PdfService;

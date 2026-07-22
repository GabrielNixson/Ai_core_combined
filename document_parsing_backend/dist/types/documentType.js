"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentType = void 0;
exports.getDocumentTypeFromExtension = getDocumentTypeFromExtension;
var DocumentType;
(function (DocumentType) {
    DocumentType["PDF"] = "PDF";
    DocumentType["DOCX"] = "DOCX";
    DocumentType["XLSX"] = "XLSX";
    DocumentType["CSV"] = "CSV";
    DocumentType["XML"] = "XML";
    DocumentType["JSON"] = "JSON";
    DocumentType["TXT"] = "TXT";
    DocumentType["HTML"] = "HTML";
    DocumentType["MARKDOWN"] = "MARKDOWN";
    DocumentType["PPTX"] = "PPTX";
    DocumentType["PNG"] = "PNG";
    DocumentType["JPEG"] = "JPEG";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
/**
 * Resolves the DocumentType enum based on file extension.
 * Handles both dot-prefixed and raw extensions.
 * Throws an error for unsupported extensions.
 */
function getDocumentTypeFromExtension(ext) {
    const cleanExt = ext.replace('.', '').trim().toUpperCase();
    switch (cleanExt) {
        case 'PDF':
            return DocumentType.PDF;
        case 'DOCX':
            return DocumentType.DOCX;
        case 'XLSX':
            return DocumentType.XLSX;
        case 'CSV':
            return DocumentType.CSV;
        case 'XML':
            return DocumentType.XML;
        case 'JSON':
            return DocumentType.JSON;
        case 'TXT':
            return DocumentType.TXT;
        case 'HTML':
        case 'HTM':
            return DocumentType.HTML;
        case 'MD':
        case 'MARKDOWN':
            return DocumentType.MARKDOWN;
        case 'PPTX':
            return DocumentType.PPTX;
        case 'PNG':
            return DocumentType.PNG;
        case 'JPG':
        case 'JPEG':
            return DocumentType.JPEG;
        default:
            throw new Error(`Unsupported document extension: ${ext}`);
    }
}
exports.default = DocumentType;

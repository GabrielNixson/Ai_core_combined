"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserFactory = void 0;
const documentType_1 = require("../../types/documentType");
const parserRegistry_1 = require("../registry/parserRegistry");
const placeholderParser_1 = require("../placeholderParser");
const pdfParser_1 = require("../pdf/pdfParser");
const docxParser_1 = require("../docx/docxParser");
const htmlParser_1 = require("../html/htmlParser");
const markdownParser_1 = require("../markdown/markdownParser");
const txtParser_1 = require("../txt/txtParser");
const jsonParser_1 = require("../json/jsonParser");
const xmlParser_1 = require("../xml/xmlParser");
const csvParser_1 = require("../csv/csvParser");
const xlsxParser_1 = require("../xlsx/xlsxParser");
const pptxParser_1 = require("../pptx/pptxParser");
const imageParser_1 = require("../image/imageParser");
// Bootstrap registration of parsers for all supported document types
for (const type of Object.values(documentType_1.DocumentType)) {
    switch (type) {
        case documentType_1.DocumentType.PDF:
            parserRegistry_1.ParserRegistry.register(type, new pdfParser_1.PdfParser());
            break;
        case documentType_1.DocumentType.DOCX:
            parserRegistry_1.ParserRegistry.register(type, new docxParser_1.DocxParser());
            break;
        case documentType_1.DocumentType.HTML:
            parserRegistry_1.ParserRegistry.register(type, new htmlParser_1.HtmlParser());
            break;
        case documentType_1.DocumentType.MARKDOWN:
            parserRegistry_1.ParserRegistry.register(type, new markdownParser_1.MarkdownParser());
            break;
        case documentType_1.DocumentType.TXT:
            parserRegistry_1.ParserRegistry.register(type, new txtParser_1.TxtParser());
            break;
        case documentType_1.DocumentType.JSON:
            parserRegistry_1.ParserRegistry.register(type, new jsonParser_1.JsonParser());
            break;
        case documentType_1.DocumentType.XML:
            parserRegistry_1.ParserRegistry.register(type, new xmlParser_1.XmlParser());
            break;
        case documentType_1.DocumentType.CSV:
            parserRegistry_1.ParserRegistry.register(type, new csvParser_1.CsvParser());
            break;
        case documentType_1.DocumentType.XLSX:
            parserRegistry_1.ParserRegistry.register(type, new xlsxParser_1.XlsxParser());
            break;
        case documentType_1.DocumentType.PPTX:
            parserRegistry_1.ParserRegistry.register(type, new pptxParser_1.PptxParser());
            break;
        case documentType_1.DocumentType.PNG:
        case documentType_1.DocumentType.JPEG:
            parserRegistry_1.ParserRegistry.register(type, new imageParser_1.ImageParser());
            break;
        default:
            parserRegistry_1.ParserRegistry.register(type, new placeholderParser_1.PlaceholderParser(type));
            break;
    }
}
class ParserFactory {
    /**
     * Retrieves the parser registered for the given DocumentType.
     * Throws an error if no matching parser was registered.
     */
    static getParser(type) {
        const parser = parserRegistry_1.ParserRegistry.getParser(type);
        if (!parser) {
            throw new Error(`No parser registered for document type: ${type}`);
        }
        return parser;
    }
}
exports.ParserFactory = ParserFactory;
exports.default = ParserFactory;

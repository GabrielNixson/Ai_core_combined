"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PptxParser = void 0;
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const pptxExtractor_1 = require("./pptxExtractor");
const presentationNormalizer_1 = require("../common/presentationNormalizer");
class PptxParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.PPTX;
    }
    /**
     * Reads a PPTX file, validates its structure, and transforms it into a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty PPTX file.');
        }
        // Verify magic numbers for PPTX (ZIP container)
        const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
        if (!isZip) {
            throw new errors_1.BadRequestError('Corrupted or invalid PPTX file: Invalid header signature.');
        }
        let presentationData;
        try {
            const extractor = new pptxExtractor_1.PptxExtractor();
            presentationData = await extractor.extract(buffer);
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Corrupted or invalid PPTX file: ${err.message}`);
        }
        if (presentationData.slides.length === 0) {
            throw new errors_1.BadRequestError('Invalid PPTX file: No slides found.');
        }
        const sections = presentationNormalizer_1.PresentationNormalizer.normalizeSlides(presentationData.slides);
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.PPTX,
            metadata: {
                title: context.originalFileName,
                sourceType: 'PPTX',
                slideCount: presentationData.slideCount,
                author: presentationData.author,
                totalPages: 1,
            },
            sections,
        };
    }
}
exports.PptxParser = PptxParser;
exports.default = PptxParser;

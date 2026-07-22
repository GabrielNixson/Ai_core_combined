"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageParser = void 0;
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const imageExtractor_1 = require("./imageExtractor");
const imageNormalizer_1 = require("../common/imageNormalizer");
class ImageParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.PNG || type === documentType_1.DocumentType.JPEG;
    }
    /**
     * Reads an image file, extracts dimensions/metadata via sharp, and maps to a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty image file.');
        }
        let metadata;
        try {
            const extractor = new imageExtractor_1.ImageExtractor();
            metadata = await extractor.extract(buffer);
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid or corrupted image file: ${err.message}`);
        }
        const sections = imageNormalizer_1.ImageNormalizer.normalizeImage(metadata, context.originalFileName);
        return {
            documentId: context.documentId,
            documentType: context.documentType, // Retain original PNG or JPEG document type
            metadata: {
                title: context.originalFileName,
                sourceType: 'IMAGE',
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                fileSize: metadata.fileSize,
                colorSpace: metadata.colorSpace,
                totalPages: 1,
            },
            sections,
        };
    }
}
exports.ImageParser = ImageParser;
exports.default = ImageParser;

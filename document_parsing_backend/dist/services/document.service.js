"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const path_1 = __importDefault(require("path"));
const document_repository_1 = require("../repositories/document.repository");
const Document_1 = require("../models/Document");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
class DocumentService {
    documentRepository;
    constructor(documentRepository = new document_repository_1.DocumentRepository()) {
        this.documentRepository = documentRepository;
    }
    /**
     * Processes the uploaded file, saves metadata to MongoDB, and returns the document.
     */
    async handleUploadedFile(file) {
        if (!file) {
            throw new errors_1.BadRequestError('No file uploaded.');
        }
        logger_1.logger.debug(`Processing file upload: ${file.originalname}`);
        // Extract UUID from stored filename (e.g. "a1b2c3d4-e5f6-...pdf")
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const documentId = path_1.default.basename(file.filename, ext);
        const docData = {
            documentId,
            originalName: file.originalname,
            storedName: file.filename,
            filePath: file.path,
            mimeType: file.mimetype,
            extension: ext,
            size: file.size,
            status: Document_1.DocumentStatus.UPLOADED,
        };
        const savedDoc = await this.documentRepository.create(docData);
        logger_1.logger.info(`Metadata saved to MongoDB for document ID: ${documentId}`);
        return savedDoc;
    }
}
exports.DocumentService = DocumentService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStorageService = void 0;
const document_repository_1 = require("../repositories/document.repository");
const Document_1 = require("../models/Document");
const logger_1 = require("../utils/logger");
class DocumentStorageService {
    documentRepository;
    constructor(documentRepository = new document_repository_1.DocumentRepository()) {
        this.documentRepository = documentRepository;
    }
    /**
     * Saves the ParsedDocument object content inside the Document record and transitions status to PARSED.
     */
    async saveParsedDocument(documentId, parsedDocument) {
        logger_1.logger.debug(`[Document Storage] Saving parsed document content for ID: ${documentId}`);
        return this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.PARSED, {
            parsedContent: parsedDocument,
        });
    }
    /**
     * Updates metadata configuration for a specific document ID.
     */
    async updateMetadata(documentId, metadata) {
        logger_1.logger.debug(`[Document Storage] Updating metadata properties for ID: ${documentId}`);
        return this.documentRepository.update({ documentId }, { metadata });
    }
    /**
     * Transitions status and merges extra document options.
     */
    async updateProcessingStatus(documentId, status, extra = {}) {
        logger_1.logger.debug(`[Document Storage] Transitioning status to ${status} for ID: ${documentId}`);
        return this.documentRepository.updateStatus(documentId, status, extra);
    }
    /**
     * Looks up document details by its documentId.
     */
    async getDocument(documentId) {
        return this.documentRepository.findByDocumentId(documentId);
    }
}
exports.DocumentStorageService = DocumentStorageService;
exports.default = DocumentStorageService;

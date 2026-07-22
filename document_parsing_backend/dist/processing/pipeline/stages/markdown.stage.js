"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownStage = void 0;
const documentExport_service_1 = require("../../../services/documentExport.service");
const documentStorage_service_1 = require("../../../services/documentStorage.service");
const Document_1 = require("../../../models/Document");
const logger_1 = require("../../../utils/logger");
class MarkdownStage {
    name = 'MarkdownStage';
    exportService;
    storageService;
    constructor(exportService = new documentExport_service_1.DocumentExportService(), storageService = new documentStorage_service_1.DocumentStorageService()) {
        this.exportService = exportService;
        this.storageService = storageService;
    }
    /**
     * Runs the export stage, calling DocumentExportService to serialize the ParsedDocument.
     */
    async execute(context) {
        if (!context.parsedDocument) {
            logger_1.logger.warn(`[MarkdownStage] No ParsedDocument found in context for document ID ${context.documentId}. Skipping export.`);
            return context;
        }
        const doc = await this.storageService.getDocument(context.documentId);
        if (doc?.status === Document_1.DocumentStatus.CANCELLED) {
            throw new Error('Job cancelled by user');
        }
        await this.storageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.EXPORTING, {
            progress: 50,
        });
        logger_1.logger.debug(`[MarkdownStage] Executing export service for document: ${context.documentId}`);
        const exportResult = await this.exportService.exportDocument(context.documentId, context.parsedDocument);
        await this.storageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.EXPORTING, {
            markdownPath: exportResult.markdownPath,
            jsonPath: exportResult.jsonPath,
            progress: 50,
        });
        return {
            ...context,
            markdownPath: exportResult.markdownPath,
            jsonPath: exportResult.jsonPath,
        };
    }
}
exports.MarkdownStage = MarkdownStage;
exports.default = MarkdownStage;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserStage = void 0;
const parserFactory_1 = require("../../../parsers/factory/parserFactory");
const documentStorage_service_1 = require("../../../services/documentStorage.service");
const Document_1 = require("../../../models/Document");
class ParserStage {
    name = 'ParserStage';
    storageService;
    constructor(storageService = new documentStorage_service_1.DocumentStorageService()) {
        this.storageService = storageService;
    }
    /**
     * Runs the parsed stage. Loads parser, executes it, saves parsed output, and transitions status.
     */
    async execute(context) {
        const doc = await this.storageService.getDocument(context.documentId);
        if (doc?.status === Document_1.DocumentStatus.CANCELLED) {
            throw new Error('Job cancelled by user');
        }
        await this.storageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.PARSING, {
            progress: 25,
        });
        const parser = parserFactory_1.ParserFactory.getParser(context.documentType);
        const parsedDocument = await parser.parse(context);
        // Save parsed document content (transitions status to PARSED and stays at 25% progress for now)
        await this.storageService.updateProcessingStatus(context.documentId, Document_1.DocumentStatus.PARSED, {
            parsedContent: parsedDocument,
            progress: 25,
        });
        return {
            ...context,
            parsedDocument,
        };
    }
}
exports.ParserStage = ParserStage;
exports.default = ParserStage;

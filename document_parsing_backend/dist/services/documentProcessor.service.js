"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessorService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config/config");
const document_repository_1 = require("../repositories/document.repository");
const processingPipeline_1 = require("../processing/pipeline/processingPipeline");
const documentType_1 = require("../types/documentType");
const parser_stage_1 = require("../processing/pipeline/stages/parser.stage");
const markdown_stage_1 = require("../processing/pipeline/stages/markdown.stage");
const chunk_stage_1 = require("../processing/pipeline/stages/chunk.stage");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const Document_1 = require("../models/Document");
class DocumentProcessorService {
    documentRepository;
    constructor(documentRepository = new document_repository_1.DocumentRepository()) {
        this.documentRepository = documentRepository;
    }
    /**
     * Orchestrates the document processing flow.
     * Loads metadata, builds context, transitions statuses, and executes pipeline stages.
     */
    async processDocument(documentId) {
        logger_1.logger.info(`[Processor Service] starting execution for document: ${documentId}`);
        // 1. Fetch document metadata from DB
        const docMeta = await this.documentRepository.findByDocumentId(documentId);
        if (!docMeta) {
            throw new errors_1.NotFoundError(`Document with ID ${documentId} not found.`);
        }
        // 2. Resolve document type from its file extension
        const documentType = (0, documentType_1.getDocumentTypeFromExtension)(docMeta.extension);
        const session = config_1.config.enableTransactions ? await mongoose_1.default.startSession() : null;
        if (session) {
            session.startTransaction();
        }
        // 3. Construct initial ProcessingContext with the session handle
        const context = {
            documentId: docMeta.documentId,
            documentType,
            filePath: docMeta.filePath,
            originalFileName: docMeta.originalName,
            metadata: docMeta.metadata || {},
            session,
        };
        // Update status to PARSING in the database
        await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.PARSING, {}, session);
        logger_1.logger.debug(`[Processor Service] status transitioned to PARSING for document: ${documentId}`);
        // 4. Construct pipeline with sequential stages
        const pipeline = new processingPipeline_1.ProcessingPipeline();
        pipeline.addStage(new parser_stage_1.ParserStage());
        pipeline.addStage(new markdown_stage_1.MarkdownStage());
        pipeline.addStage(new chunk_stage_1.ChunkStage());
        try {
            // 5. Execute processing stages
            const finalContext = await pipeline.execute(context);
            // 6. On success, update status to CHUNKED (the final parsed stage)
            await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.CHUNKED, {
                parsedContent: finalContext.parsedDocument,
                markdownPath: finalContext.markdownPath,
                jsonPath: finalContext.jsonPath,
                chunksCount: finalContext.chunks?.length || 0,
            }, session);
            if (session) {
                await session.commitTransaction();
            }
            logger_1.logger.info(`[Processor Service] successfully completed document: ${documentId}`);
            return finalContext;
        }
        catch (error) {
            if (session) {
                await session.abortTransaction();
            }
            const errMsg = error.message || String(error);
            logger_1.logger.error(`[Processor Service] failed for document: ${documentId}. Reason: ${errMsg}`);
            // On failure, update status to FAILED and record error message outside the aborted transaction session
            await this.documentRepository.updateStatus(documentId, Document_1.DocumentStatus.FAILED, {
                errorDetails: errMsg,
            });
            throw error;
        }
        finally {
            if (session) {
                session.endSession();
            }
        }
    }
}
exports.DocumentProcessorService = DocumentProcessorService;
exports.default = DocumentProcessorService;

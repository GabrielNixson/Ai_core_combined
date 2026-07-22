import mongoose from 'mongoose';
import { config } from '../config/config';
import { DocumentRepository } from '../repositories/document.repository';
import { ProcessingPipeline } from '../processing/pipeline/processingPipeline';
import { ProcessingContext } from '../processing/context/processingContext';
import { getDocumentTypeFromExtension } from '../types/documentType';
import { ParserStage } from '../processing/pipeline/stages/parser.stage';
import { MarkdownStage } from '../processing/pipeline/stages/markdown.stage';
import { ChunkStage } from '../processing/pipeline/stages/chunk.stage';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { DocumentStatus } from '../models/Document';

export class DocumentProcessorService {
  private documentRepository: DocumentRepository;

  constructor(documentRepository = new DocumentRepository()) {
    this.documentRepository = documentRepository;
  }

  /**
   * Orchestrates the document processing flow.
   * Loads metadata, builds context, transitions statuses, and executes pipeline stages.
   */
  public async processDocument(documentId: string): Promise<ProcessingContext> {
    logger.info(`[Processor Service] starting execution for document: ${documentId}`);

    // 1. Fetch document metadata from DB
    const docMeta = await this.documentRepository.findByDocumentId(documentId);
    if (!docMeta) {
      throw new NotFoundError(`Document with ID ${documentId} not found.`);
    }

    // 2. Resolve document type from its file extension
    const documentType = getDocumentTypeFromExtension(docMeta.extension);

    const session = config.enableTransactions ? await mongoose.startSession() : null;
    if (session) {
      session.startTransaction();
    }

    // 3. Construct initial ProcessingContext with the session handle
    const context: ProcessingContext = {
      documentId: docMeta.documentId,
      documentType,
      filePath: docMeta.filePath,
      originalFileName: docMeta.originalName,
      metadata: docMeta.metadata || {},
      session,
    };

    // Update status to PARSING in the database
    await this.documentRepository.updateStatus(documentId, DocumentStatus.PARSING, {}, session);
    logger.debug(`[Processor Service] status transitioned to PARSING for document: ${documentId}`);

    // 4. Construct pipeline with sequential stages
    const pipeline = new ProcessingPipeline();
    pipeline.addStage(new ParserStage());
    pipeline.addStage(new MarkdownStage());
    pipeline.addStage(new ChunkStage());

    try {
      // 5. Execute processing stages
      const finalContext = await pipeline.execute(context);

      // 6. On success, update status to CHUNKED (the final parsed stage)
      await this.documentRepository.updateStatus(documentId, DocumentStatus.CHUNKED, {
        parsedContent: finalContext.parsedDocument,
        markdownPath: finalContext.markdownPath,
        jsonPath: finalContext.jsonPath,
        chunksCount: finalContext.chunks?.length || 0,
      }, session);

      if (session) {
        await session.commitTransaction();
      }

      logger.info(`[Processor Service] successfully completed document: ${documentId}`);
      return finalContext;
    } catch (error: any) {
      if (session) {
        await session.abortTransaction();
      }
      const errMsg = error.message || String(error);
      logger.error(`[Processor Service] failed for document: ${documentId}. Reason: ${errMsg}`);

      // On failure, update status to FAILED and record error message outside the aborted transaction session
      await this.documentRepository.updateStatus(documentId, DocumentStatus.FAILED, {
        errorDetails: errMsg,
      });

      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}
export default DocumentProcessorService;

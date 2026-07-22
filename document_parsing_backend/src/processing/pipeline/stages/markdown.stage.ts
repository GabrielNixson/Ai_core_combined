import { ProcessingStage } from '../processingStage.interface';
import { ProcessingContext } from '../../context/processingContext';
import { DocumentExportService } from '../../../services/documentExport.service';
import { DocumentStorageService } from '../../../services/documentStorage.service';
import { DocumentStatus } from '../../../models/Document';
import { logger } from '../../../utils/logger';

export class MarkdownStage implements ProcessingStage {
  public readonly name = 'MarkdownStage';
  private exportService: DocumentExportService;
  private storageService: DocumentStorageService;

  constructor(
    exportService = new DocumentExportService(),
    storageService = new DocumentStorageService()
  ) {
    this.exportService = exportService;
    this.storageService = storageService;
  }

  /**
   * Runs the export stage, calling DocumentExportService to serialize the ParsedDocument.
   */
  public async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!context.parsedDocument) {
      logger.warn(`[MarkdownStage] No ParsedDocument found in context for document ID ${context.documentId}. Skipping export.`);
      return context;
    }

    const doc = await this.storageService.getDocument(context.documentId);
    if (doc?.status === DocumentStatus.CANCELLED) {
      throw new Error('Job cancelled by user');
    }

    await this.storageService.updateProcessingStatus(context.documentId, DocumentStatus.EXPORTING, {
      progress: 50,
    });

    logger.debug(`[MarkdownStage] Executing export service for document: ${context.documentId}`);
    const exportResult = await this.exportService.exportDocument(context.documentId, context.parsedDocument);

    await this.storageService.updateProcessingStatus(context.documentId, DocumentStatus.EXPORTING, {
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
export default MarkdownStage;

import { ProcessingStage } from '../processingStage.interface';
import { ProcessingContext } from '../../context/processingContext';
import { ParserFactory } from '../../../parsers/factory/parserFactory';
import { DocumentStorageService } from '../../../services/documentStorage.service';
import { DocumentStatus } from '../../../models/Document';

export class ParserStage implements ProcessingStage {
  public readonly name = 'ParserStage';
  private storageService: DocumentStorageService;

  constructor(storageService = new DocumentStorageService()) {
    this.storageService = storageService;
  }

  /**
   * Runs the parsed stage. Loads parser, executes it, saves parsed output, and transitions status.
   */
  public async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const doc = await this.storageService.getDocument(context.documentId);
    if (doc?.status === DocumentStatus.CANCELLED) {
      throw new Error('Job cancelled by user');
    }

    await this.storageService.updateProcessingStatus(context.documentId, DocumentStatus.PARSING, {
      progress: 25,
    });

    const parser = ParserFactory.getParser(context.documentType);
    const parsedDocument = await parser.parse(context);

    // Save parsed document content (transitions status to PARSED and stays at 25% progress for now)
    await this.storageService.updateProcessingStatus(context.documentId, DocumentStatus.PARSED, {
      parsedContent: parsedDocument,
      progress: 25,
    });

    return {
      ...context,
      parsedDocument,
    };
  }
}
export default ParserStage;

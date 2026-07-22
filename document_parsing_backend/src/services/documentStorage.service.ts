import { IDocumentRepository } from '../interfaces/documentRepository.interface';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentStatus, IDocument } from '../models/Document';
import { ParsedDocument } from '../types/parsedDocument';
import { logger } from '../utils/logger';

export class DocumentStorageService {
  private documentRepository: IDocumentRepository;

  constructor(documentRepository: IDocumentRepository = new DocumentRepository()) {
    this.documentRepository = documentRepository;
  }

  /**
   * Saves the ParsedDocument object content inside the Document record and transitions status to PARSED.
   */
  public async saveParsedDocument(
    documentId: string,
    parsedDocument: ParsedDocument
  ): Promise<IDocument | null> {
    logger.debug(`[Document Storage] Saving parsed document content for ID: ${documentId}`);
    return this.documentRepository.updateStatus(documentId, DocumentStatus.PARSED, {
      parsedContent: parsedDocument,
    });
  }

  /**
   * Updates metadata configuration for a specific document ID.
   */
  public async updateMetadata(
    documentId: string,
    metadata: Record<string, any>
  ): Promise<IDocument | null> {
    logger.debug(`[Document Storage] Updating metadata properties for ID: ${documentId}`);
    return this.documentRepository.update(
      { documentId },
      { metadata }
    );
  }

  /**
   * Transitions status and merges extra document options.
   */
  public async updateProcessingStatus(
    documentId: string,
    status: DocumentStatus,
    extra: Partial<IDocument> = {}
  ): Promise<IDocument | null> {
    logger.debug(`[Document Storage] Transitioning status to ${status} for ID: ${documentId}`);
    return this.documentRepository.updateStatus(documentId, status, extra);
  }

  /**
   * Looks up document details by its documentId.
   */
  public async getDocument(documentId: string): Promise<IDocument | null> {
    return this.documentRepository.findByDocumentId(documentId);
  }
}
export default DocumentStorageService;

import { IRepository } from './repository.interface';
import { IDocument, DocumentStatus } from '../models/Document';

export interface IDocumentRepository extends IRepository<IDocument> {
  /**
   * Finds a document by its documentId field.
   */
  findByDocumentId(documentId: string): Promise<IDocument | null>;

  /**
   * Finds documents of a specific documentType.
   */
  findByDocumentType(documentType: string): Promise<IDocument[]>;

  /**
   * Finds documents in a specific status state.
   */
  findByStatus(status: DocumentStatus): Promise<IDocument[]>;

  /**
   * Updates status and optional metadata fields for a documentId.
   */
  updateStatus(
    documentId: string,
    status: DocumentStatus,
    extra?: Partial<IDocument>
  ): Promise<IDocument | null>;

  /**
   * Checks if a document exists for the documentId.
   */
  exists(documentId: string): Promise<boolean>;
}
export default IDocumentRepository;

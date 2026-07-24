import path from 'path';
import { DocumentRepository } from '../repositories/document.repository';
import { IDocument, DocumentStatus } from '../models/Document';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export class DocumentService {
  private documentRepository: DocumentRepository;

  constructor(documentRepository = new DocumentRepository()) {
    this.documentRepository = documentRepository;
  }

  /**
   * Processes the uploaded file, saves metadata to MongoDB, and returns the document.
   */
  public async handleUploadedFile(file?: Express.Multer.File): Promise<IDocument> {
    if (!file) {
      throw new BadRequestError('No file uploaded.');
    }

    logger.debug(`Processing file upload: ${file.originalname}`);

    // Extract UUID from stored filename (e.g. "a1b2c3d4-e5f6-...pdf")
    const ext = path.extname(file.originalname).toLowerCase();
    const rawStoredName = file.filename || (file as any).key || '';
    const storedName = path.basename(rawStoredName);
    const documentId = path.basename(storedName, ext);

    const docData: Partial<IDocument> = {
      documentId,
      originalName: file.originalname,
      storedName: storedName,
      filePath: file.path || (file as any).key || '',
      mimeType: file.mimetype,
      extension: ext,
      size: file.size,
      status: DocumentStatus.UPLOADED,
    };

    const savedDoc = await this.documentRepository.create(docData);
    logger.info(`Metadata saved to MongoDB for document ID: ${documentId}`);

    return savedDoc;
  }
}

import { BaseRepository } from './base.repository';
import { IDocument, DocumentModel, DocumentStatus } from '../models/Document';
import { IDocumentRepository } from '../interfaces/documentRepository.interface';
import { config } from '../config/config';

export class DocumentRepository
  extends BaseRepository<IDocument, any>
  implements IDocumentRepository
{
  constructor() {
    super(DocumentModel);
  }

  /**
   * Overrides find to filter out soft-deleted documents and attach the session context.
   */
  public override async find(filter: Record<string, any>, session?: any): Promise<IDocument[]> {
    const finalFilter = config.enableSoftDelete
      ? { ...filter, isDeleted: { $ne: true } }
      : filter;
    return super.find(finalFilter, session);
  }

  /**
   * Overrides findOne to filter out soft-deleted documents and attach the session context.
   */
  public override async findOne(filter: Record<string, any>, session?: any): Promise<IDocument | null> {
    const finalFilter = config.enableSoftDelete
      ? { ...filter, isDeleted: { $ne: true } }
      : filter;
    return super.findOne(finalFilter, session);
  }

  /**
   * Overrides create to configure initial versioning, soft-delete, and attach the session context.
   */
  public override async create(item: Partial<IDocument>, session?: any): Promise<IDocument> {
    const defaultData: Partial<IDocument> = {
      isDeleted: false,
      processingVersion: item.processingVersion ?? 1,
      ...item,
    };
    return super.create(defaultData, session);
  }

  /**
   * Overrides delete to perform soft deletes using the session context if enabled.
   */
  public override async delete(filter: Record<string, any>, session?: any): Promise<boolean> {
    if (config.enableSoftDelete) {
      const result = await this.model
        .updateMany(filter, {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: 'system',
          },
        }, { session })
        .exec();
      return (result.modifiedCount ?? 0) > 0;
    } else {
      return super.delete(filter, session);
    }
  }

  public async findByDocumentId(documentId: string, session?: any): Promise<IDocument | null> {
    return this.findOne({ documentId }, session);
  }

  public async findByDocumentType(documentType: string, session?: any): Promise<IDocument[]> {
    return this.find({ documentType }, session);
  }

  public async findByStatus(status: DocumentStatus, session?: any): Promise<IDocument[]> {
    return this.find({ status }, session);
  }

  public async updateStatus(
    documentId: string,
    status: DocumentStatus,
    extra: Partial<IDocument> = {},
    session?: any
  ): Promise<IDocument | null> {
    return this.update({ documentId }, { status, ...extra }, session);
  }

  public async exists(documentId: string, session?: any): Promise<boolean> {
    const doc = await this.findOne({ documentId }, session);
    return doc !== null;
  }
}
export default DocumentRepository;

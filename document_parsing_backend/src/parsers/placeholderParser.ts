import { DocumentParser } from './interfaces/documentParser.interface';
import { DocumentType } from '../types/documentType';
import { ProcessingContext } from '../processing/context/processingContext';
import { ParsedDocument } from '../types/parsedDocument';

export class PlaceholderParser implements DocumentParser {
  private supportedType: DocumentType;

  constructor(supportedType: DocumentType) {
    this.supportedType = supportedType;
  }

  /**
   * Checks if this parser supports the request's DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === this.supportedType;
  }

  /**
   * Performs a mock parse, returning a structured ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    return {
      documentId: context.documentId,
      documentType: context.documentType,
      metadata: {
        title: context.originalFileName,
        author: 'System Placeholder',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPages: 1,
      },
      sections: [
        {
          title: 'Document Processing Details',
          level: 1,
          content: [
            {
              type: 'paragraph',
              content: `This is placeholder parsed content for file "${context.originalFileName}" of type ${context.documentType}.`,
            },
          ],
        },
      ],
    };
  }
}
export default PlaceholderParser;

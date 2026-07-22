import { DocumentType } from '../../types/documentType';
import { ParsedDocument } from '../../types/parsedDocument';
import { DocumentChunk } from '../../types/documentChunk';

export interface ProcessingContext {
  documentId: string;
  documentType: DocumentType;
  filePath: string;
  originalFileName: string;
  parsedDocument?: ParsedDocument;
  markdownPath?: string;
  jsonPath?: string;
  chunks?: DocumentChunk[];
  metadata?: Record<string, any>;
  session?: any;
}
export default ProcessingContext;

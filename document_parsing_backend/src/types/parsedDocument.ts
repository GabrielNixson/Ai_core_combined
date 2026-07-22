import { DocumentType } from './documentType';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  totalPages?: number;
  [key: string]: any; // Allows extensibility for custom metadata extracted from files
}

export interface ContentBlock {
  type: string; // e.g., 'paragraph', 'heading', 'table', 'image', 'list_item', 'footnote'
  content: any;  // The block payload (string, object representing a table, etc.)
  metadata?: Record<string, any>; // Stores pagination citation and future block metrics
}

export interface DocumentSection {
  title?: string;
  level: number; // Heading level, e.g., 1 for H1, 2 for H2, etc.
  content: ContentBlock[];
}

export interface ParsedDocument {
  documentId: string;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  sections: DocumentSection[];
}
export default ParsedDocument;

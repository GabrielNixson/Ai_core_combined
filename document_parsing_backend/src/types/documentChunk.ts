export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  contentType: string; // e.g. TEXT, TABLE, PRESENTATION, STRUCTURED_DATA, SPREADSHEET
  title: string;
  section?: string;
  sectionPath?: string;
  pageStart?: number;
  pageEnd?: number;
  slideNumber?: number;
  metadata?: Record<string, any>;
  tokenEstimate: number;
  characterCount: number;
  embeddingId?: string;
  vectorId?: string;
  parentChunkId?: string;
  previousChunkId?: string;
  nextChunkId?: string;
  embedding?: number[];
  embeddingModel?: string;
  embeddingVersion?: number;
  embeddingCreatedAt?: Date;
  embeddingStatus?: string;
  embeddingDimensions?: number;
  vectorSyncStatus?: string;
  vectorSyncedAt?: Date;
  vectorSyncError?: string;
  createdAt: Date;
  updatedAt?: Date;
}
export default DocumentChunk;

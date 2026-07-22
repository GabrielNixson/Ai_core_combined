import mongoose, { Schema, Document } from 'mongoose';
import { DocumentChunk } from '../../types/documentChunk';

export interface DocumentChunkMongoose extends DocumentChunk, Document {}

const DocumentChunkSchema = new Schema<DocumentChunkMongoose>({
  chunkId: { type: String, required: true, unique: true },
  documentId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  contentType: { type: String, required: true, index: true },
  title: { type: String, required: true },
  section: { type: String, index: true },
  sectionPath: { type: String },
  pageStart: { type: Number, index: true },
  pageEnd: { type: Number },
  slideNumber: { type: Number },
  metadata: { type: Schema.Types.Mixed },
  tokenEstimate: { type: Number, required: true, index: true },
  characterCount: { type: Number, required: true },
  embeddingId: { type: String },
  vectorId: { type: String },
  parentChunkId: { type: String },
  previousChunkId: { type: String },
  nextChunkId: { type: String },
  embedding: { type: [Number] },
  embeddingModel: { type: String },
  embeddingVersion: { type: Number },
  embeddingCreatedAt: { type: Date },
  embeddingStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'], default: 'PENDING', index: true },
  embeddingDimensions: { type: Number },
  vectorSyncStatus: { type: String, enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'RETRYING'], default: 'PENDING', index: true },
  vectorSyncedAt: { type: Date },
  vectorSyncError: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// Configure compound lookup indexes
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const ChunkModel = mongoose.model<DocumentChunkMongoose>('DocumentChunk', DocumentChunkSchema);
export default ChunkModel;

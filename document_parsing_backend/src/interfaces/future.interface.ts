import { ParsedDocument } from '../types/parsedDocument';
import { DocumentChunk } from '../types/documentChunk';

export interface MarkdownGenerator {
  generate(document: ParsedDocument): Promise<string>;
}

export interface ChunkGenerator {
  generate(document: ParsedDocument): Promise<DocumentChunk[]>;
}

export interface EmbeddingProvider {
  generateEmbeddings(text: string): Promise<number[]>;
}

export interface VectorStore {
  save(chunks: DocumentChunk[], embeddings: number[][]): Promise<void>;
}

export interface OCRProvider {
  extractText(imageBuffer: Buffer): Promise<string>;
}
export default interface FutureInterfacesPlaceholder {}

import { RetrievalResult } from '../../retrieval/models/retrieval.types';

export interface LLMConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  answer: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface SourceAttribution {
  documentId: string;
  chunkId: string;
  title: string;
  section: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  slideNumber: number | null;
}

export interface RAGResponse {
  answer: string;
  sources: SourceAttribution[];
  retrievedChunks: RetrievalResult[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
  model: string;
}

export interface GlobalRAGStats {
  averageResponseTimeMs: number;
  averageLlmLatencyMs: number;
  averageRetrievalLatencyMs: number;
  averagePromptTokens: number;
  averageCompletionTokens: number;
  cacheHitRatio: number;
  totalQueries: number;
}

import { RetrievalResult } from '../models/retrieval.types';

export interface Reranker {
  name: string;
  rerank(query: string, candidates: RetrievalResult[]): Promise<RetrievalResult[]>;
}

export default Reranker;

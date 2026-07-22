import { Reranker } from './reranker.interface';
import { RetrievalResult } from '../models/retrieval.types';

export class PassThroughReranker implements Reranker {
  public name = 'PassThroughReranker';

  public async rerank(_query: string, candidates: RetrievalResult[]): Promise<RetrievalResult[]> {
    // Returns candidates sorted by score descending
    return [...candidates].sort((a, b) => b.score - a.score);
  }
}

export default PassThroughReranker;

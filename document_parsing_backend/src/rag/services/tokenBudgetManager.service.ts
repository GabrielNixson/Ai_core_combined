import { RetrievalResult } from '../../retrieval/models/retrieval.types';
import { logger } from '../../utils/logger';

export class TokenBudgetManager {
  private characterToTokenRatio = 4;

  /**
   * Estimates token count for a text string.
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.characterToTokenRatio);
  }

  /**
   * Fits retrieved candidate chunks inside the token limit.
   */
  public budgetContext(
    candidates: RetrievalResult[],
    maxContextTokens: number
  ): RetrievalResult[] {
    let currentTokens = 0;
    const accepted: RetrievalResult[] = [];

    for (const chunk of candidates) {
      const chunkTokens = this.estimateTokens(chunk.content);
      if (currentTokens + chunkTokens <= maxContextTokens) {
        accepted.push(chunk);
        currentTokens += chunkTokens;
      } else {
        logger.warn(`[Token Budget Manager] Context limit reached. Dropping lower ranked chunk: ${chunk.chunkId} (Estimated Tokens: ${chunkTokens}). Current context budget: ${currentTokens}/${maxContextTokens} tokens.`);
      }
    }

    return accepted;
  }
}

export default TokenBudgetManager;

export class TokenEstimator {
  /**
   * Approximates the token count of a given text block based on standard heuristics.
   * English text average: 1 token ≈ 4 characters.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  }
}
export default TokenEstimator;

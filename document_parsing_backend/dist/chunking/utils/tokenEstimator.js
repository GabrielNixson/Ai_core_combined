"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenEstimator = void 0;
class TokenEstimator {
    /**
     * Approximates the token count of a given text block based on standard heuristics.
     * English text average: 1 token ≈ 4 characters.
     */
    static estimateTokens(text) {
        if (!text)
            return 0;
        return Math.max(1, Math.ceil(text.length / 4));
    }
}
exports.TokenEstimator = TokenEstimator;
exports.default = TokenEstimator;

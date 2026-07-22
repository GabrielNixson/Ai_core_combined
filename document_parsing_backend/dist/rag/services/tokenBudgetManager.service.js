"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBudgetManager = void 0;
const logger_1 = require("../../utils/logger");
class TokenBudgetManager {
    characterToTokenRatio = 4;
    /**
     * Estimates token count for a text string.
     */
    estimateTokens(text) {
        if (!text)
            return 0;
        return Math.ceil(text.length / this.characterToTokenRatio);
    }
    /**
     * Fits retrieved candidate chunks inside the token limit.
     */
    budgetContext(candidates, maxContextTokens) {
        let currentTokens = 0;
        const accepted = [];
        for (const chunk of candidates) {
            const chunkTokens = this.estimateTokens(chunk.content);
            if (currentTokens + chunkTokens <= maxContextTokens) {
                accepted.push(chunk);
                currentTokens += chunkTokens;
            }
            else {
                logger_1.logger.warn(`[Token Budget Manager] Context limit reached. Dropping lower ranked chunk: ${chunk.chunkId} (Estimated Tokens: ${chunkTokens}). Current context budget: ${currentTokens}/${maxContextTokens} tokens.`);
            }
        }
        return accepted;
    }
}
exports.TokenBudgetManager = TokenBudgetManager;
exports.default = TokenBudgetManager;

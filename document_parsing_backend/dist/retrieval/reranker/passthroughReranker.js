"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassThroughReranker = void 0;
class PassThroughReranker {
    name = 'PassThroughReranker';
    async rerank(_query, candidates) {
        // Returns candidates sorted by score descending
        return [...candidates].sort((a, b) => b.score - a.score);
    }
}
exports.PassThroughReranker = PassThroughReranker;
exports.default = PassThroughReranker;

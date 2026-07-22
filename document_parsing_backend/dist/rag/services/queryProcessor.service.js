"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProcessor = void 0;
const logger_1 = require("../../utils/logger");
class QueryProcessor {
    /**
     * Cleans, validates, and normalizes a user query.
     */
    processQuery(query) {
        if (!query) {
            throw new Error('[Query Processor] Search query cannot be empty.');
        }
        // Filter out control characters (non-printable chars) first
        let normalized = query.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        // Trim whitespace and normalize multiple spaces/newlines
        normalized = normalized.trim().replace(/\s+/g, ' ');
        if (normalized.length < 2) {
            throw new Error('[Query Processor] Search query is too short. Query must contain at least 2 alphanumeric characters.');
        }
        logger_1.logger.debug(`[Query Processor] Normalized query: "${normalized}"`);
        return normalized;
    }
}
exports.QueryProcessor = QueryProcessor;
exports.default = QueryProcessor;

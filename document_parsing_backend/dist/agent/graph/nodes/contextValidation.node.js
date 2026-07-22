"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextValidationNode = contextValidationNode;
const logger_1 = require("../../../utils/logger");
async function contextValidationNode(state) {
    const plan = state.metadata.plan || {};
    const metadata = { ...state.metadata };
    if (plan.needRAG) {
        const hasContext = state.sources && state.sources.length > 0;
        metadata.contextIsValid = hasContext;
        if (!hasContext) {
            logger_1.logger.warn('[Context Validation Node] Warning: RAG was executed but returned empty context sources.');
        }
        else {
            logger_1.logger.info('[Context Validation Node] Context validation passed.');
        }
    }
    else {
        metadata.contextIsValid = true;
    }
    return { metadata };
}
exports.default = contextValidationNode;

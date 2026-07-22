"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolSelectionNode = toolSelectionNode;
const logger_1 = require("../../../utils/logger");
async function toolSelectionNode(state) {
    const plan = state.metadata.plan || {};
    const selectedTools = [];
    if (plan.needRAG) {
        selectedTools.push('askRAG');
    }
    if (plan.needSearch) {
        selectedTools.push('searchDocuments');
    }
    if (plan.needMetadata) {
        selectedTools.push('getMetadata');
    }
    const updatedMetadata = {
        ...state.metadata,
        selectedTools,
    };
    logger_1.logger.info(`[Tool Selection Node] Selected tools: ${JSON.stringify(selectedTools)}`);
    return { metadata: updatedMetadata };
}
exports.default = toolSelectionNode;

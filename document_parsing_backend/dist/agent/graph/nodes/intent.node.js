"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentNode = intentNode;
const logger_1 = require("../../../utils/logger");
async function intentNode(state) {
    const query = (state.currentQuery || '').toLowerCase();
    let intent = 'General Chat';
    if (query.includes('search') || query.includes('find document') || query.includes('list files') || query.includes('retrieve chunks')) {
        intent = 'Document Search';
    }
    else if (query.includes('metadata') || query.includes('properties') || query.includes('details for') || query.includes('info about')) {
        intent = 'Metadata Request';
    }
    else if (query.includes('summarize') || query.includes('summary')) {
        intent = 'Summarization';
    }
    else if (query.includes('compare') || query.includes('difference') || query.includes('versus') || query.includes('vs')) {
        intent = 'Comparison';
    }
    else if (query.includes('what') || query.includes('how') || query.includes('why') || query.includes('explain') || query.includes('describe')) {
        intent = 'Question Answering';
    }
    logger_1.logger.info(`[Intent Node] Classified query intent: "${intent}"`);
    return { intent };
}
exports.default = intentNode;

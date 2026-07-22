"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningNode = planningNode;
const logger_1 = require("../../../utils/logger");
async function planningNode(state) {
    const intent = state.intent;
    const metadata = { ...state.metadata };
    let needRAG = false;
    let needMetadata = false;
    let needSearch = false;
    let canAnswerDirectly = false;
    switch (intent) {
        case 'Document Search':
            needSearch = true;
            break;
        case 'Metadata Request':
            needMetadata = true;
            break;
        case 'Question Answering':
        case 'Summarization':
        case 'Comparison':
            needRAG = true;
            break;
        case 'General Chat':
        default:
            canAnswerDirectly = true;
            break;
    }
    metadata.plan = { needRAG, needMetadata, needSearch, canAnswerDirectly };
    logger_1.logger.info(`[Planning Node] Selected Plan: ${JSON.stringify(metadata.plan)}`);
    return { metadata };
}
exports.default = planningNode;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNode = startNode;
const inMemory_provider_1 = require("../../memory/inMemory.provider");
const logger_1 = require("../../../utils/logger");
async function startNode(state) {
    logger_1.logger.info(`[Start Node] Starting agent workflow for query: "${state.currentQuery}"`);
    const conversationId = state.conversationId;
    const memory = inMemory_provider_1.InMemoryMemoryProvider.getInstance();
    const history = await memory.getMessages(conversationId);
    const mergedMessages = [...history];
    // Append current query to messages if not already present in history
    if (state.currentQuery && !history.some(m => m.content === state.currentQuery && m.role === 'user')) {
        mergedMessages.push({ role: 'user', content: state.currentQuery });
    }
    return {
        messages: mergedMessages,
        toolResults: [],
        sources: [],
        retrievedContext: '',
        llmResponse: '',
    };
}
exports.default = startNode;

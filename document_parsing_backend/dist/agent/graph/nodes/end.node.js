"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endNode = endNode;
const inMemory_provider_1 = require("../../memory/inMemory.provider");
const logger_1 = require("../../../utils/logger");
async function endNode(state) {
    logger_1.logger.info('[End Node] Saving final generated agent response to memory store.');
    if (state.llmResponse) {
        const memory = inMemory_provider_1.InMemoryMemoryProvider.getInstance();
        // Save user's original message if it's not already in memory
        const history = await memory.getMessages(state.conversationId);
        if (state.currentQuery && !history.some(m => m.content === state.currentQuery && m.role === 'user')) {
            await memory.saveMessage(state.conversationId, {
                role: 'user',
                content: state.currentQuery,
            });
        }
        // Save agent's reply
        await memory.saveMessage(state.conversationId, {
            role: 'assistant',
            content: state.llmResponse,
        });
    }
    return {};
}
exports.default = endNode;

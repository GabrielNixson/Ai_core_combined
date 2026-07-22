"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmNode = llmNode;
const openai_provider_1 = require("../../../rag/providers/openai.provider");
const config_1 = require("../../../config/config");
const logger_1 = require("../../../utils/logger");
async function llmNode(state) {
    logger_1.logger.info('[LLM Node] Formulating response.');
    // 1. Check if we already have an answer from askRAG tool
    const ragResult = (state.toolResults || []).find(r => r.tool === 'askRAG');
    if (ragResult && ragResult.output && ragResult.output.answer) {
        logger_1.logger.info('[LLM Node] Reusing answer from Ask RAG Tool.');
        return { llmResponse: ragResult.output.answer };
    }
    // 2. Otherwise generate response using LLM provider
    const provider = new openai_provider_1.OpenAIProvider();
    let prompt = '';
    const messagesStr = (state.messages || [])
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
    if (state.intent === 'Metadata Request') {
        const metaResult = (state.toolResults || []).find(r => r.tool === 'getMetadata');
        const metaStr = metaResult ? JSON.stringify(metaResult.output, null, 2) : 'No metadata retrieved.';
        prompt = `SYSTEM: ${config_1.config.agentSystemPrompt || 'Format the following metadata information clearly.'}
USER: Explain or show this metadata in a readable format for query: "${state.currentQuery}"
METADATA:
${metaStr}`;
    }
    else if (state.intent === 'Document Search') {
        const searchResult = (state.toolResults || []).find(r => r.tool === 'searchDocuments');
        const searchStr = searchResult ? JSON.stringify(searchResult.output, null, 2) : 'No search results.';
        prompt = `SYSTEM: ${config_1.config.agentSystemPrompt || 'Summarize the document search results.'}
USER: Show the following search results matching: "${state.currentQuery}"
RESULTS:
${searchStr}`;
    }
    else {
        // General chat
        prompt = `SYSTEM: ${config_1.config.agentSystemPrompt || 'You are a helpful AI assistant.'}
CONVERSATION HISTORY:
${messagesStr}
ASSISTANT:`;
    }
    const llmResponse = await provider.generateResponse(prompt, {
        model: config_1.config.agentDefaultModel || 'gpt-4o-mini',
    });
    return { llmResponse: llmResponse.answer };
}
exports.default = llmNode;

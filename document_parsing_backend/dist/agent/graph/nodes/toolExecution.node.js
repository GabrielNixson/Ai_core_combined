"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolExecutionNode = toolExecutionNode;
const searchDocuments_tool_1 = require("../../tools/searchDocuments.tool");
const askRAG_tool_1 = require("../../tools/askRAG.tool");
const getMetadata_tool_1 = require("../../tools/getMetadata.tool");
const logger_1 = require("../../../utils/logger");
async function toolExecutionNode(state) {
    const selectedTools = state.metadata.selectedTools || [];
    const results = [];
    const searchTool = new searchDocuments_tool_1.SearchDocumentsTool();
    const ragTool = new askRAG_tool_1.AskRAGTool();
    const metaTool = new getMetadata_tool_1.GetMetadataTool();
    for (const toolName of selectedTools) {
        logger_1.logger.info(`[Tool Execution Node] Executing tool: ${toolName}`);
        try {
            if (toolName === 'searchDocuments') {
                const docId = state.metadata.documentId || undefined;
                const pageNum = state.metadata.pageNumber !== undefined ? state.metadata.pageNumber : undefined;
                const res = await searchTool.execute({
                    query: state.currentQuery,
                    documentId: docId,
                    pageNumber: pageNum,
                });
                results.push({ tool: toolName, output: res });
            }
            else if (toolName === 'askRAG') {
                const docId = state.metadata.documentId || undefined;
                const res = await ragTool.execute({
                    query: state.currentQuery,
                    documentId: docId,
                });
                results.push({ tool: toolName, output: res });
            }
            else if (toolName === 'getMetadata') {
                const docId = state.metadata.documentId || undefined;
                const chunkId = state.metadata.chunkId || undefined;
                const action = state.metadata.action || 'getDocumentMetadata';
                const res = await metaTool.execute({
                    action,
                    documentId: docId,
                    chunkId,
                });
                results.push({ tool: toolName, output: res });
            }
        }
        catch (err) {
            logger_1.logger.error(`[Tool Execution Node] Tool ${toolName} failed: ${err.message}`);
            results.push({ tool: toolName, error: err.message });
        }
    }
    // Extract sources and context elements from the execution results for response mappings
    let retrievedContext = '';
    let sources = [];
    const ragResult = results.find(r => r.tool === 'askRAG');
    if (ragResult && ragResult.output) {
        sources = ragResult.output.sources || [];
        retrievedContext = JSON.stringify(ragResult.output.retrievedChunks || '');
    }
    return {
        toolResults: results,
        sources,
        retrievedContext,
    };
}
exports.default = toolExecutionNode;

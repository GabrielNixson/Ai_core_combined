"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseNode = responseNode;
const logger_1 = require("../../../utils/logger");
async function responseNode(state) {
    logger_1.logger.info('[Response Node] Processing sources and formatting output.');
    let sources = state.sources || [];
    if (sources.length === 0) {
        const searchResult = (state.toolResults || []).find(r => r.tool === 'searchDocuments');
        if (searchResult && Array.isArray(searchResult.output)) {
            sources = searchResult.output.map((chunk) => ({
                documentId: chunk.documentId,
                chunkId: chunk.chunkId,
                title: chunk.title,
                section: chunk.section || null,
                pageStart: chunk.pageStart || null,
                pageEnd: chunk.pageEnd || null,
                slideNumber: chunk.slideNumber || null,
            }));
        }
    }
    return { sources };
}
exports.default = responseNode;

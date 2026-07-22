"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskRAGTool = void 0;
const rag_service_1 = require("../../rag/services/rag.service");
const logger_1 = require("../../utils/logger");
class AskRAGTool {
    name = 'askRAG';
    description = 'Asks questions using Retrieval Augmented Generation (RAG) which pulls context and generates responses using LLMs. Inputs: query (string), documentId (optional string).';
    ragService;
    constructor(ragService = new rag_service_1.RAGService()) {
        this.ragService = ragService;
    }
    async execute(input) {
        logger_1.logger.info(`[Ask RAG Tool] Asking: "${input.query}"`);
        const filters = {};
        if (input.documentId)
            filters.documentId = input.documentId;
        const response = await this.ragService.generateAnswer(input.query, filters);
        return response;
    }
}
exports.AskRAGTool = AskRAGTool;
exports.default = AskRAGTool;

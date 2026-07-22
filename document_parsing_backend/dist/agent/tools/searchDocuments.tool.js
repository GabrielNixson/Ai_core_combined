"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchDocumentsTool = void 0;
const retrieval_service_1 = require("../../retrieval/services/retrieval.service");
const logger_1 = require("../../utils/logger");
class SearchDocumentsTool {
    name = 'searchDocuments';
    description = 'Performs semantic similarity search across document text chunks. Inputs: query (string), documentId (optional string), pageNumber (optional number).';
    retrievalService;
    constructor(retrievalService = new retrieval_service_1.RetrievalService()) {
        this.retrievalService = retrievalService;
    }
    async execute(input) {
        logger_1.logger.info(`[Search Documents Tool] Executing query: "${input.query}"`);
        const filters = {};
        if (input.documentId)
            filters.documentId = input.documentId;
        if (input.pageNumber !== undefined && input.pageNumber !== null) {
            filters.pageNumber = Number(input.pageNumber);
        }
        const results = await this.retrievalService.retrieve(input.query, filters);
        return results;
    }
}
exports.SearchDocumentsTool = SearchDocumentsTool;
exports.default = SearchDocumentsTool;

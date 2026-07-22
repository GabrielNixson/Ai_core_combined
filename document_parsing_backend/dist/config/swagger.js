"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const config_1 = require("./config");
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Document Processing & RAG Agent Framework API',
            version: '1.0.0',
            description: 'Production-grade document processing, ingestion, semantic search, RAG, and AI agent workflow API documentation.',
        },
        servers: [
            {
                url: `http://localhost:${config_1.appConfig.port}`,
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Bearer token authorization using JWTs. Placeholder for future authentication mechanisms.',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        './src/app.ts',
        './src/routes/*.ts',
        './src/retrieval/routes/*.ts',
        './src/rag/routes/*.ts',
        './src/agent/routes/*.ts',
        './src/health/*.ts',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = exports.swaggerSpec;

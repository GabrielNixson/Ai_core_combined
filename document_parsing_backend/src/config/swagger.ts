import swaggerJSDoc from 'swagger-jsdoc';
import { appConfig } from './config';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Document Processing & RAG Agent Framework API',
      version: '1.0.0',
      description: 'Production-grade document processing, ingestion, semantic search, RAG, and AI agent workflow API documentation.',
    },
    servers: [
      {
        url: `http://localhost:${appConfig.port}`,
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

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;

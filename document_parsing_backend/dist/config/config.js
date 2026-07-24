"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.loggingConfig = exports.storageConfig = exports.securityConfig = exports.vectorConfig = exports.aiConfig = exports.queueConfig = exports.databaseConfig = exports.appConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load environment variables from .env file
dotenv_1.default.config();
// Schema definitions for subconfigs
const AppConfigSchema = zod_1.z.object({
    env: zod_1.z.string().default('development'),
    port: zod_1.z.coerce.number().default(3000),
    enableMarkdownExport: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
    enableJsonExport: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
});
const DatabaseConfigSchema = zod_1.z.object({
    mongoUri: zod_1.z.string().default('mongodb://127.0.0.1:27017/document_processor'),
    batchInsertSize: zod_1.z.coerce.number().default(100),
    enableTransactions: zod_1.z.preprocess((val) => val === 'true', zod_1.z.boolean().default(false)),
    enableSoftDelete: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
});
const QueueConfigSchema = zod_1.z.object({
    redisHost: zod_1.z.string().default('127.0.0.1'),
    redisPort: zod_1.z.coerce.number().default(6379),
    redisPassword: zod_1.z.string().optional(),
    workerConcurrency: zod_1.z.coerce.number().default(1),
    maxRetries: zod_1.z.coerce.number().default(3),
    retryDelay: zod_1.z.coerce.number().default(5000),
    queuePrefix: zod_1.z.string().default('doc_processing'),
});
const AIConfigSchema = zod_1.z.object({
    openaiApiKey: zod_1.z.string().optional(),
    embeddingProvider: zod_1.z.string().default('openai'),
    embeddingModel: zod_1.z.string().default('text-embedding-3-small'),
    embeddingBatchSize: zod_1.z.coerce.number().default(100),
    embeddingMaxRetries: zod_1.z.coerce.number().default(3),
    embeddingRequestTimeout: zod_1.z.coerce.number().default(30000),
    // Retrieval Configuration
    retrievalDefaultTopK: zod_1.z.coerce.number().default(5),
    retrievalMinimumScore: zod_1.z.coerce.number().default(0.7),
    retrievalMaxReturnedChunks: zod_1.z.coerce.number().default(10),
    retrievalEnableNeighborExpansion: zod_1.z.preprocess((val) => val === 'true', zod_1.z.boolean().default(false)),
    retrievalEnableReranking: zod_1.z.preprocess((val) => val === 'true', zod_1.z.boolean().default(false)),
    enableRetrievalCache: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
    // RAG Configuration
    ragLlmProvider: zod_1.z.string().default('openai'),
    ragLlmModel: zod_1.z.string().default('gpt-4o-mini'),
    ragLlmTemperature: zod_1.z.coerce.number().default(0.2),
    ragLlmMaxTokens: zod_1.z.coerce.number().default(1000),
    ragLlmSystemPrompt: zod_1.z.string().default("You are an expert system assistant. Answer the user's question accurately using only the provided context. Cite sources appropriately."),
    enableRagCache: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
    // Agent Configuration
    agentDefaultModel: zod_1.z.string().default('gpt-4o-mini'),
    agentSystemPrompt: zod_1.z.string().default("You are a helpful AI Agent that orchestrates backend tasks."),
    agentMaxIterations: zod_1.z.coerce.number().default(5),
    enableAgentMemory: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
    enableAgentCheckpointing: zod_1.z.preprocess((val) => val !== 'false', zod_1.z.boolean().default(true)),
});
const VectorConfigSchema = zod_1.z.object({
    qdrantHost: zod_1.z.string().default('http://localhost:6333'),
    qdrantApiKey: zod_1.z.string().optional(),
    collectionName: zod_1.z.string().default('documents'),
    vectorDimensions: zod_1.z.coerce.number().default(1536),
    distanceMetric: zod_1.z.enum(['Cosine', 'Euclidean', 'Dot']).default('Cosine'),
    qdrantBatchSize: zod_1.z.coerce.number().default(100),
    qdrantTimeout: zod_1.z.coerce.number().default(30000),
});
const SecurityConfigSchema = zod_1.z.object({
    corsOrigin: zod_1.z.string().default('*'),
    rateLimitWindowMs: zod_1.z.coerce.number().default(15 * 60 * 1000), // 15 mins
    rateLimitMax: zod_1.z.coerce.number().default(100), // limit each IP to 100 requests per windowMs
    requestSizeLimit: zod_1.z.string().default('50mb'),
});
const StorageConfigSchema = zod_1.z.object({
    maxUploadSize: zod_1.z.coerce.number().default(52428800), // Default 50MB (52,428,800 bytes)
    uploadsDir: zod_1.z.string().default('uploads'),
    storageProvider: zod_1.z.enum(['local', 'minio']).default('local'),
    minioEndpoint: zod_1.z.string().default('http://localhost:9000'),
    minioAccessKey: zod_1.z.string().default('minioadmin'),
    minioSecretKey: zod_1.z.string().default('miniopassword'),
    minioBucket: zod_1.z.string().default('iiot-documents'),
});
const LoggingConfigSchema = zod_1.z.object({
    logLevel: zod_1.z.string().default('info'),
    logFormat: zod_1.z.enum(['json', 'pretty']).default('pretty'),
});
// Full Config Schema
const ConfigSchema = zod_1.z.object({
    app: AppConfigSchema,
    db: DatabaseConfigSchema,
    queue: QueueConfigSchema,
    ai: AIConfigSchema,
    vector: VectorConfigSchema,
    security: SecurityConfigSchema,
    storage: StorageConfigSchema,
    logging: LoggingConfigSchema,
});
let rawConfig;
try {
    rawConfig = ConfigSchema.parse({
        app: {
            env: process.env.NODE_ENV,
            port: process.env.PORT,
            enableMarkdownExport: process.env.ENABLE_MARKDOWN_EXPORT,
            enableJsonExport: process.env.ENABLE_JSON_EXPORT,
        },
        db: {
            mongoUri: process.env.MONGODB_URI,
            batchInsertSize: process.env.BATCH_INSERT_SIZE,
            enableTransactions: process.env.ENABLE_TRANSACTIONS,
            enableSoftDelete: process.env.ENABLE_SOFT_DELETE,
        },
        queue: {
            redisHost: process.env.REDIS_HOST,
            redisPort: process.env.REDIS_PORT,
            redisPassword: process.env.REDIS_PASSWORD,
            workerConcurrency: process.env.WORKER_CONCURRENCY,
            maxRetries: process.env.MAX_RETRIES,
            retryDelay: process.env.RETRY_DELAY,
            queuePrefix: process.env.QUEUE_PREFIX,
        },
        ai: {
            openaiApiKey: process.env.OPENAI_API_KEY,
            embeddingProvider: process.env.EMBEDDING_PROVIDER,
            embeddingModel: process.env.EMBEDDING_MODEL,
            embeddingBatchSize: process.env.EMBEDDING_BATCH_SIZE,
            embeddingMaxRetries: process.env.EMBEDDING_MAX_RETRIES,
            embeddingRequestTimeout: process.env.EMBEDDING_REQUEST_TIMEOUT,
            retrievalDefaultTopK: process.env.RETRIEVAL_DEFAULT_TOP_K,
            retrievalMinimumScore: process.env.RETRIEVAL_MINIMUM_SCORE,
            retrievalMaxReturnedChunks: process.env.RETRIEVAL_MAX_RETURNED_CHUNKS,
            retrievalEnableNeighborExpansion: process.env.RETRIEVAL_ENABLE_NEIGHBOR_EXPANSION,
            retrievalEnableReranking: process.env.RETRIEVAL_ENABLE_RERANKING,
            enableRetrievalCache: process.env.ENABLE_RETRIEVAL_CACHE,
            ragLlmProvider: process.env.RAG_LLM_PROVIDER,
            ragLlmModel: process.env.RAG_LLM_MODEL,
            ragLlmTemperature: process.env.RAG_LLM_TEMPERATURE,
            ragLlmMaxTokens: process.env.RAG_LLM_MAX_TOKENS,
            ragLlmSystemPrompt: process.env.RAG_LLM_SYSTEM_PROMPT,
            enableRagCache: process.env.ENABLE_RAG_CACHE,
            agentDefaultModel: process.env.AGENT_DEFAULT_MODEL,
            agentSystemPrompt: process.env.AGENT_SYSTEM_PROMPT,
            agentMaxIterations: process.env.AGENT_MAX_ITERATIONS,
            enableAgentMemory: process.env.ENABLE_AGENT_MEMORY,
            enableAgentCheckpointing: process.env.ENABLE_AGENT_CHECKPOINTING,
        },
        vector: {
            qdrantHost: process.env.QDRANT_HOST,
            qdrantApiKey: process.env.QDRANT_API_KEY,
            collectionName: process.env.QDRANT_COLLECTION_NAME,
            vectorDimensions: process.env.QDRANT_VECTOR_DIMENSIONS,
            distanceMetric: process.env.QDRANT_DISTANCE_METRIC,
            qdrantBatchSize: process.env.QDRANT_SYNC_BATCH_SIZE,
            qdrantTimeout: process.env.QDRANT_TIMEOUT,
        },
        security: {
            corsOrigin: process.env.CORS_ORIGIN,
            rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
            rateLimitMax: process.env.RATE_LIMIT_MAX,
            requestSizeLimit: process.env.REQUEST_SIZE_LIMIT,
        },
        storage: {
            maxUploadSize: process.env.MAX_UPLOAD_SIZE,
            uploadsDir: process.env.UPLOADS_DIR,
            storageProvider: process.env.STORAGE_PROVIDER,
            minioEndpoint: process.env.MINIO_ENDPOINT,
            minioAccessKey: process.env.MINIO_ACCESS_KEY,
            minioSecretKey: process.env.MINIO_SECRET_KEY,
            minioBucket: process.env.MINIO_BUCKET,
        },
        logging: {
            logLevel: process.env.LOG_LEVEL,
            logFormat: process.env.LOG_FORMAT,
        },
    });
}
catch (error) {
    if (error instanceof zod_1.z.ZodError) {
        console.error('❌ Configuration validation failed:');
        error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        });
    }
    else {
        console.error('❌ Unknown configuration validation error:', error);
    }
    process.exit(1);
}
// Alert if API key is missing
if (!rawConfig.ai.openaiApiKey && rawConfig.app.env === 'production') {
    console.warn('⚠️ WARNING: OPENAI_API_KEY is not defined in production environment.');
}
// Export parsed subconfigs
exports.appConfig = rawConfig.app;
exports.databaseConfig = rawConfig.db;
exports.queueConfig = rawConfig.queue;
exports.aiConfig = rawConfig.ai;
exports.vectorConfig = rawConfig.vector;
exports.securityConfig = rawConfig.security;
exports.storageConfig = rawConfig.storage;
exports.loggingConfig = rawConfig.logging;
// Map config object for backwards compatibility
exports.config = Object.freeze({
    env: rawConfig.app.env,
    port: rawConfig.app.port,
    mongoUri: rawConfig.db.mongoUri,
    maxUploadSize: rawConfig.storage.maxUploadSize,
    uploadsDir: path_1.default.resolve(process.cwd(), rawConfig.storage.uploadsDir),
    storageProvider: rawConfig.storage.storageProvider,
    minioEndpoint: rawConfig.storage.minioEndpoint,
    minioAccessKey: rawConfig.storage.minioAccessKey,
    minioSecretKey: rawConfig.storage.minioSecretKey,
    minioBucket: rawConfig.storage.minioBucket,
    enableMarkdownExport: rawConfig.app.enableMarkdownExport,
    enableJsonExport: rawConfig.app.enableJsonExport,
    batchInsertSize: rawConfig.db.batchInsertSize,
    enableTransactions: rawConfig.db.enableTransactions,
    enableSoftDelete: rawConfig.db.enableSoftDelete,
    redisHost: rawConfig.queue.redisHost,
    redisPort: rawConfig.queue.redisPort,
    redisPassword: rawConfig.queue.redisPassword,
    workerConcurrency: rawConfig.queue.workerConcurrency,
    maxRetries: rawConfig.queue.maxRetries,
    retryDelay: rawConfig.queue.retryDelay,
    queuePrefix: rawConfig.queue.queuePrefix,
    embeddingProvider: rawConfig.ai.embeddingProvider,
    embeddingModel: rawConfig.ai.embeddingModel,
    embeddingBatchSize: rawConfig.ai.embeddingBatchSize,
    embeddingMaxRetries: rawConfig.ai.embeddingMaxRetries,
    embeddingRequestTimeout: rawConfig.ai.embeddingRequestTimeout,
    openaiApiKey: rawConfig.ai.openaiApiKey,
    qdrantHost: rawConfig.vector.qdrantHost,
    qdrantApiKey: rawConfig.vector.qdrantApiKey,
    collectionName: rawConfig.vector.collectionName,
    vectorDimensions: rawConfig.vector.vectorDimensions,
    distanceMetric: rawConfig.vector.distanceMetric,
    qdrantBatchSize: rawConfig.vector.qdrantBatchSize,
    qdrantTimeout: rawConfig.vector.qdrantTimeout,
    retrievalDefaultTopK: rawConfig.ai.retrievalDefaultTopK,
    retrievalMinimumScore: rawConfig.ai.retrievalMinimumScore,
    retrievalMaxReturnedChunks: rawConfig.ai.retrievalMaxReturnedChunks,
    retrievalEnableNeighborExpansion: rawConfig.ai.retrievalEnableNeighborExpansion,
    retrievalEnableReranking: rawConfig.ai.retrievalEnableReranking,
    enableRetrievalCache: rawConfig.ai.enableRetrievalCache,
    ragLlmProvider: rawConfig.ai.ragLlmProvider,
    ragLlmModel: rawConfig.ai.ragLlmModel,
    ragLlmTemperature: rawConfig.ai.ragLlmTemperature,
    ragLlmMaxTokens: rawConfig.ai.ragLlmMaxTokens,
    ragLlmSystemPrompt: rawConfig.ai.ragLlmSystemPrompt,
    enableRagCache: rawConfig.ai.enableRagCache,
    agentDefaultModel: rawConfig.ai.agentDefaultModel,
    agentSystemPrompt: rawConfig.ai.agentSystemPrompt,
    agentMaxIterations: rawConfig.ai.agentMaxIterations,
    enableAgentMemory: rawConfig.ai.enableAgentMemory,
    enableAgentCheckpointing: rawConfig.ai.enableAgentCheckpointing,
});
exports.default = exports.config;

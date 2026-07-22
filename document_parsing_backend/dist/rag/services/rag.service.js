"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = exports.RAGMetricsTracker = void 0;
const retrieval_service_1 = require("../../retrieval/services/retrieval.service");
const openai_provider_1 = require("../providers/openai.provider");
const queryProcessor_service_1 = require("./queryProcessor.service");
const tokenBudgetManager_service_1 = require("./tokenBudgetManager.service");
const contextBuilder_service_1 = require("./contextBuilder.service");
const promptBuilder_service_1 = require("./promptBuilder.service");
const retrieval_cache_1 = require("../../retrieval/cache/retrieval.cache");
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class RAGMetricsTracker {
    static instance;
    totalQueries = 0;
    totalResponseTimeMs = 0;
    totalLlmLatencyMs = 0;
    totalRetrievalLatencyMs = 0;
    totalPromptTokens = 0;
    totalCompletionTokens = 0;
    constructor() { }
    static getInstance() {
        if (!RAGMetricsTracker.instance) {
            RAGMetricsTracker.instance = new RAGMetricsTracker();
        }
        return RAGMetricsTracker.instance;
    }
    recordQuery(responseTimeMs, llmLatencyMs, retrievalLatencyMs, promptTokens, completionTokens) {
        this.totalQueries++;
        this.totalResponseTimeMs += responseTimeMs;
        this.totalLlmLatencyMs += llmLatencyMs;
        this.totalRetrievalLatencyMs += retrievalLatencyMs;
        this.totalPromptTokens += promptTokens;
        this.totalCompletionTokens += completionTokens;
    }
    getStats() {
        const cacheStats = retrieval_cache_1.RetrievalCache.getInstance().getStats();
        const avgResponse = this.totalQueries > 0 ? this.totalResponseTimeMs / this.totalQueries : 0;
        const avgLlm = this.totalQueries > 0 ? this.totalLlmLatencyMs / this.totalQueries : 0;
        const avgRetrieval = this.totalQueries > 0 ? this.totalRetrievalLatencyMs / this.totalQueries : 0;
        const avgPrompt = this.totalQueries > 0 ? this.totalPromptTokens / this.totalQueries : 0;
        const avgCompletion = this.totalQueries > 0 ? this.totalCompletionTokens / this.totalQueries : 0;
        return {
            averageResponseTimeMs: parseFloat(avgResponse.toFixed(2)),
            averageLlmLatencyMs: parseFloat(avgLlm.toFixed(2)),
            averageRetrievalLatencyMs: parseFloat(avgRetrieval.toFixed(2)),
            averagePromptTokens: Math.round(avgPrompt),
            averageCompletionTokens: Math.round(avgCompletion),
            cacheHitRatio: cacheStats.hitRatio,
            totalQueries: this.totalQueries,
        };
    }
}
exports.RAGMetricsTracker = RAGMetricsTracker;
class RAGService {
    retrievalService;
    llmProvider;
    queryProcessor;
    tokenManager;
    contextBuilder;
    promptBuilder;
    cache;
    metrics;
    constructor(retrievalService = new retrieval_service_1.RetrievalService(), llmProvider = new openai_provider_1.OpenAIProvider(), queryProcessor = new queryProcessor_service_1.QueryProcessor(), tokenManager = new tokenBudgetManager_service_1.TokenBudgetManager(), contextBuilder = new contextBuilder_service_1.ContextBuilder(), promptBuilder = new promptBuilder_service_1.PromptBuilder()) {
        this.retrievalService = retrievalService;
        this.llmProvider = llmProvider;
        this.queryProcessor = queryProcessor;
        this.tokenManager = tokenManager;
        this.contextBuilder = contextBuilder;
        this.promptBuilder = promptBuilder;
        this.cache = retrieval_cache_1.RetrievalCache.getInstance();
        this.metrics = RAGMetricsTracker.getInstance();
    }
    /**
     * Main RAG execution pipeline.
     */
    async generateAnswer(userQuery, filters, overrideLLMConfig, retrievalOptions) {
        const startTime = Date.now();
        // 1. Process and normalize query
        const normalizedQuery = this.queryProcessor.processQuery(userQuery);
        // 2. Check RAG Response Cache
        if (config_1.config.enableRagCache) {
            const cached = await this.cache.getRagResponse(normalizedQuery, filters || {}, overrideLLMConfig || {});
            if (cached) {
                logger_1.logger.info(`[RAG Service] Cache hit for query: "${normalizedQuery.substring(0, 30)}..."`);
                const timeElapsed = Date.now() - startTime;
                this.metrics.recordQuery(timeElapsed, 0, 0, cached.tokenUsage.promptTokens, cached.tokenUsage.completionTokens);
                return {
                    ...cached,
                    processingTime: timeElapsed,
                };
            }
        }
        // 3. Execute Vector Retrieval
        const retrievalStart = Date.now();
        const retrievedChunks = await this.retrievalService.retrieve(normalizedQuery, filters, retrievalOptions);
        const retrievalLatency = Date.now() - retrievalStart;
        // 4. Build Context and Deduplicate Chunks
        const { deduplicated } = this.contextBuilder.buildContext(retrievedChunks);
        // 5. Manage Prompt Token Budgeting
        const systemPrompt = overrideLLMConfig?.systemPrompt || config_1.config.ragLlmSystemPrompt;
        const sysTokens = this.tokenManager.estimateTokens(systemPrompt);
        const queryTokens = this.tokenManager.estimateTokens(normalizedQuery);
        const responseReserve = overrideLLMConfig?.maxTokens || config_1.config.ragLlmMaxTokens || 1000;
        const maxPromptTokens = 4000; // Target total prompt space constraint
        const contextBudget = maxPromptTokens - (sysTokens + queryTokens + responseReserve);
        // Fit chunks within remaining token budget (fallback to minimum 1000 tokens space)
        const budgetedChunks = this.tokenManager.budgetContext(deduplicated, contextBudget > 500 ? contextBudget : 1000);
        // Build finalized logical context string from budgeted chunks
        const { contextText: finalContextText } = this.contextBuilder.buildContext(budgetedChunks);
        // 6. Format prompt template
        const prompt = this.promptBuilder.buildPrompt(systemPrompt, finalContextText, normalizedQuery);
        // 7. Invoke LLM Provider
        const llmStart = Date.now();
        const llmResponse = await this.llmProvider.generateResponse(prompt, overrideLLMConfig);
        const llmLatency = Date.now() - llmStart;
        // 8. Compile Source Attributions
        const sources = budgetedChunks.map(chunk => ({
            documentId: chunk.documentId,
            chunkId: chunk.chunkId,
            title: chunk.title,
            section: chunk.section || null,
            pageStart: chunk.pageStart || null,
            pageEnd: chunk.pageEnd || null,
            slideNumber: chunk.slideNumber || null,
        }));
        const totalTime = Date.now() - startTime;
        const response = {
            answer: llmResponse.answer,
            sources,
            retrievedChunks: budgetedChunks,
            tokenUsage: llmResponse.tokenUsage,
            processingTime: totalTime,
            model: llmResponse.model,
        };
        // Cache final RAG response in Redis
        if (config_1.config.enableRagCache) {
            await this.cache.setRagResponse(normalizedQuery, filters || {}, overrideLLMConfig || {}, response);
        }
        // Record Metrics
        this.metrics.recordQuery(totalTime, llmLatency, retrievalLatency, llmResponse.tokenUsage.promptTokens, llmResponse.tokenUsage.completionTokens);
        logger_1.logger.info(`[RAG Service] RAG Pipeline complete. Total Time: ${totalTime}ms (LLM: ${llmLatency}ms, Retrieval: ${retrievalLatency}ms)`);
        return response;
    }
}
exports.RAGService = RAGService;
exports.default = RAGService;

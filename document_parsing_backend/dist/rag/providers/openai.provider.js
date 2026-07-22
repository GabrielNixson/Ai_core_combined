"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config/config");
const logger_1 = require("../../utils/logger");
class OpenAIProvider {
    name = 'OpenAIProvider';
    client;
    isMock = false;
    constructor() {
        const key = config_1.config.openaiApiKey;
        if (!key || key.includes('mock') || key.includes('your_openai_key') || (process.env.NODE_ENV === 'test' && key === 'mock-key-for-now')) {
            this.isMock = true;
            logger_1.logger.warn('[OpenAI Provider] Running in MOCK mode. Prompt completion will be simulated.');
        }
        this.client = new openai_1.default({
            apiKey: key || 'mock-key-for-now',
        });
    }
    /**
     * Dispatches the prompt to OpenAI Completions endpoint.
     */
    async generateResponse(prompt, overrideConfig) {
        const model = overrideConfig?.model || config_1.config.ragLlmModel || 'gpt-4o-mini';
        const temperature = overrideConfig?.temperature !== undefined ? overrideConfig.temperature : (config_1.config.ragLlmTemperature || 0.2);
        const maxTokens = overrideConfig?.maxTokens || config_1.config.ragLlmMaxTokens || 1000;
        const topP = overrideConfig?.topP;
        const frequencyPenalty = overrideConfig?.frequencyPenalty;
        const presencePenalty = overrideConfig?.presencePenalty;
        if (this.isMock) {
            const mockAnswer = `[Mock Answer] This is a simulated response generated from prompt context. Prompt length: ${prompt.length} characters.`;
            const promptTokens = Math.ceil(prompt.length / 4);
            const completionTokens = 30;
            return {
                answer: mockAnswer,
                tokenUsage: {
                    promptTokens,
                    completionTokens,
                    totalTokens: promptTokens + completionTokens,
                },
                model,
            };
        }
        try {
            const response = await this.client.chat.completions.create({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: maxTokens,
                top_p: topP,
                frequency_penalty: frequencyPenalty,
                presence_penalty: presencePenalty,
            });
            const choice = response.choices[0];
            const answer = choice?.message?.content || '';
            const usage = response.usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            };
            return {
                answer,
                tokenUsage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                },
                model: response.model || model,
            };
        }
        catch (err) {
            logger_1.logger.error(`[OpenAI Provider] Completions API failed: ${err.message || err}`);
            throw err;
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
exports.default = OpenAIProvider;

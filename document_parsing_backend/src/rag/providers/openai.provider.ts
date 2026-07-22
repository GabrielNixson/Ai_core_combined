import OpenAI from 'openai';
import { LLMProvider } from './llmProvider.interface';
import { LLMResponse, LLMConfig } from '../models/rag.types';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export class OpenAIProvider implements LLMProvider {
  public name = 'OpenAIProvider';
  private client: OpenAI;
  private isMock = false;

  constructor() {
    const key = config.openaiApiKey;
    if (!key || key.includes('mock') || key.includes('your_openai_key') || (process.env.NODE_ENV === 'test' && key === 'mock-key-for-now')) {
      this.isMock = true;
      logger.warn('[OpenAI Provider] Running in MOCK mode. Prompt completion will be simulated.');
    }
    this.client = new OpenAI({
      apiKey: key || 'mock-key-for-now',
    });
  }

  /**
   * Dispatches the prompt to OpenAI Completions endpoint.
   */
  public async generateResponse(prompt: string, overrideConfig?: LLMConfig): Promise<LLMResponse> {
    const model = overrideConfig?.model || config.ragLlmModel || 'gpt-4o-mini';
    const temperature = overrideConfig?.temperature !== undefined ? overrideConfig.temperature : (config.ragLlmTemperature || 0.2);
    const maxTokens = overrideConfig?.maxTokens || config.ragLlmMaxTokens || 1000;
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
    } catch (err: any) {
      logger.error(`[OpenAI Provider] Completions API failed: ${err.message || err}`);
      throw err;
    }
  }
}

export default OpenAIProvider;

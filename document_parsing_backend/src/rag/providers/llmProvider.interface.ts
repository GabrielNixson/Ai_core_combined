import { LLMResponse, LLMConfig } from '../models/rag.types';

export interface LLMProvider {
  name: string;
  generateResponse(prompt: string, overrideConfig?: LLMConfig): Promise<LLMResponse>;
}

export default LLMProvider;

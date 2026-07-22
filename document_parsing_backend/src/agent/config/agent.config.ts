export interface AgentConfig {
  defaultModel: string;
  systemPrompt: string;
  maxIterations: number;
  enableMemory: boolean;
  enableCheckpointing: boolean;
}

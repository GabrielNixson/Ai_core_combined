import { Annotation } from '@langchain/langgraph';
import { Message } from '../memory/conversationMemory.interface';

export const AgentStateAnnotation = Annotation.Root({
  conversationId: Annotation<string>(),
  userId: Annotation<string>(),
  messages: Annotation<Message[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  currentQuery: Annotation<string>(),
  intent: Annotation<string>(),
  retrievedContext: Annotation<string>(),
  toolResults: Annotation<any[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  llmResponse: Annotation<string>(),
  sources: Annotation<any[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  metadata: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;

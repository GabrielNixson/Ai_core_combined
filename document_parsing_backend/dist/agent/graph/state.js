"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.AgentStateAnnotation = langgraph_1.Annotation.Root({
    conversationId: (0, langgraph_1.Annotation)(),
    userId: (0, langgraph_1.Annotation)(),
    messages: (0, langgraph_1.Annotation)({
        reducer: (_, y) => y,
        default: () => [],
    }),
    currentQuery: (0, langgraph_1.Annotation)(),
    intent: (0, langgraph_1.Annotation)(),
    retrievedContext: (0, langgraph_1.Annotation)(),
    toolResults: (0, langgraph_1.Annotation)({
        reducer: (_, y) => y,
        default: () => [],
    }),
    llmResponse: (0, langgraph_1.Annotation)(),
    sources: (0, langgraph_1.Annotation)({
        reducer: (_, y) => y,
        default: () => [],
    }),
    metadata: (0, langgraph_1.Annotation)({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    }),
});

import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", () => {
    return { messages: [new AIMessage("Hello!")] };
  })
  .addEdge(START, "agent")
  .addEdge("agent", END);

const app = workflow.compile();

async function main() {
  const stream = await app.stream({ messages: [] }, { streamMode: "messages" });
  for await (const chunk of stream) {
    console.log("Chunk:", chunk);
  }
}
main();

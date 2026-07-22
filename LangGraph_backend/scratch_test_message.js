import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./src/db/index.js";
import { createMcpClient } from "./src/mcp/mcpClient.js";
import { loadTools } from "./src/tools/tools.js";
import { createAgent } from "./src/agent/agent.js";
import { initAgent, streamAgent } from "./src/services/agent.service.js";

async function run() {
  console.log("Connecting database...");
  await connectDB();

  console.log("Connecting MCP Client...");
  const mcpClient = await createMcpClient();

  console.log("Loading tools...");
  const tools = await loadTools(mcpClient);
  console.log("Loaded tools names:", tools.map(t => t.name));

  console.log("Initializing Agent...");
  await initAgent(tools, createAgent);

  console.log("\n--- Testing Direct get_grounding_context Tool Call via MCP Client ---");
  try {
    const res = await mcpClient.callTool({
      name: "get_grounding_context",
      arguments: { query: "Phase 12" }
    });
    console.log("get_grounding_context tool result:\n", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("❌ get_grounding_context tool call failed:", err.message);
  }

  console.log("\nRunning streamAgent test...");
  try {
    await streamAgent(
      "How do I wire the EM 6400?",
      [],
      (token) => {
        console.log(`[Token] -> ${token}`);
      },
      (tool) => {
        console.log(`[Tool] ->`, JSON.stringify(tool, null, 2));
      }
    );
    console.log("✅ streamAgent finished successfully!");
  } catch (error) {
    console.error("❌ streamAgent crashed:", error);
  }
  process.exit(0);
}

run();

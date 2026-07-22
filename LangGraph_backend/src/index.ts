import express from "express";
import http from "http";
import cors from "cors";

import { config } from "./config";
import { connectDB } from "./db";
import { initSocket } from "./sockets/chat.socket";
import { createMcpClient } from "./mcp/mcpClient";
import { loadTools } from "./tools/tools";
import { createAgent } from "./agent/agent";
import { initAgent } from "./services/agent.service";
import { checkOllamaModels } from "./utils/ollama";

import userRoutes from "./routes/user.routes";
import chatRoutes from "./routes/chat.routes";
import extractionRoutes from "./routes/extraction.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/extraction", extractionRoutes);

const server = http.createServer(app);

async function start() {
  await connectDB();
  await checkOllamaModels();

  const mcpClient = await createMcpClient();
  const tools = await loadTools(mcpClient);

  await initAgent(tools, createAgent);

  initSocket(server);

  server.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
  });
}

start();
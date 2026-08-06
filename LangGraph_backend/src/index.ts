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

app.get("/", (req, res) => {
  res.send("Hello from Plixy LangGraph Backend!");
});

app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/extraction", extractionRoutes);

// Global error handler to return JSON errors with CORS headers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Global error handler caught an error:", err);
  
  // Explicitly ensure CORS headers are set on errors
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
});

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
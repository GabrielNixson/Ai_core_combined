import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { liveDataSchema, liveDataHandler } from "../tools/liveData.tool";

export function createMcpServer() {
  const server = new McpServer({
    name: "energy-mcp-service",
    version: "1.0.0"
  });

  server.tool(
    "getLiveMeterData",
    liveDataSchema,   
    liveDataHandler
  );

  return server;
}

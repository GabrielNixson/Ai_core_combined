import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export async function createMcpClient() {
  const mcpServerPath = process.env.MCP_SERVER_PATH || path.resolve(process.cwd(), "../MCP_Server/dist/index.js");

  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpServerPath],
    env: process.env as Record<string, string>,
  });

  const client = new Client(
    { name: "plc-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}
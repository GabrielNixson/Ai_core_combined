"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const liveData_tool_1 = require("../tools/liveData.tool");
function createMcpServer() {
    const server = new mcp_js_1.McpServer({
        name: "energy-mcp-service",
        version: "1.0.0"
    });
    server.tool("getLiveMeterData", liveData_tool_1.liveDataSchema, liveData_tool_1.liveDataHandler);
    return server;
}
//# sourceMappingURL=server.js.map
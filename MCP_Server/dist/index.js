"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const plc_service_1 = require("./services/plc.service");
const influx_service_1 = require("./services/influx.service");
(0, plc_service_1.startPolling)();
const server = new index_js_1.Server({
    name: "plc-live-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tell Cursor what tools exist
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_live_data",
                description: `
Returns real-time PLC electrical measurements.

IMPORTANT:
- Always return EXACT numeric values (do NOT round, approximate, or ignore small values)
- Values may be very small (e.g., 0.0001) and must be preserved exactly
- Do NOT convert units
- Do NOT summarize or modify values

Response format:
{
  "success": boolean,
  "timestamp": string (ISO 8601),
  "data": {
    "voltage": number (Volts),
    "current": number (Amps),
    "power": number (kW),
    "frequency": number (Hz)
  }
}
`,
                inputSchema: {
                    type: "object",
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: "get_analysis_data",
                description: `
Retrieve historical PLC data from time-series database.

IMPORTANT RULES:
- Preserve full numeric precision (no rounding)
- Return raw computed values from database
- Do NOT modify aggregation results
- Do NOT skip small values

Parameters:
- range: time duration (e.g., "1h", "24h", "7d")
- field: measurement field (e.g., "voltage", "current", "power")
- aggregation: one of ["mean", "sum", "min", "max"]

Response format:
{
  "success": boolean,
  "data": [
    {
      "time": string (ISO 8601),
      "value": number
    }
  ]
}
`,
                inputSchema: {
                    type: "object",
                    properties: {
                        range: {
                            type: "string",
                            description: "Time range (e.g., 1h, 24h, 7d)"
                        },
                        field: {
                            type: "string",
                            description: "PLC field name"
                        },
                        aggregation: {
                            type: "string",
                            enum: ["mean", "sum", "min", "max"]
                        }
                    },
                    required: ["range"],
                    additionalProperties: false
                }
            },
            {
                name: "get_grounding_context",
                description: `
Retrieve relevant grounding context and manual chunks for the user's questions about uploaded manuals, documentation, and device guides.

IMPORTANT:
- Use this tool when the user asks questions about device settings, manual text, installation guides, parameter lists, warnings, or codes.
- It performs semantic search on the uploaded documents.

Response format:
{
  "success": boolean,
  "results": [
    {
      "chunkId": string,
      "content": string,
      "sourceReference": string,
      "score": number
    }
  ]
}
`,
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to look up in manual chunks"
                        }
                    },
                    required: ["query"],
                    additionalProperties: false
                }
            }
        ],
    };
});
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_live_data") {
        const data = (0, plc_service_1.getCachedLiveData)();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        data,
                        timestamp: new Date().toISOString(),
                    }),
                },
            ],
        };
    }
    if (request.params.name === "get_analysis_data") {
        const { range, field, aggregation } = request.params.arguments;
        const options = { range };
        if (field !== undefined)
            options.field = field;
        if (aggregation !== undefined)
            options.aggregation = aggregation;
        const data = await (0, influx_service_1.queryAnalysisData)(options);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    if (request.params.name === "get_grounding_context") {
        const { query } = request.params.arguments;
        try {
            const response = await fetch("http://localhost:3000/retrieval/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    options: {
                        minimumScore: -1.0
                    }
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const searchData = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            results: searchData.results || [],
                        }),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    },
                ],
            };
        }
    }
    throw new Error("Tool not found");
});
// Connect stdio transport
(async () => {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
})();
//# sourceMappingURL=index.js.map
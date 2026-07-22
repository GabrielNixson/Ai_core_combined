import dotenv from "dotenv";
dotenv.config();

import assert from "assert";
import { connectDB } from "./src/db/index";
import { createMcpClient } from "./src/mcp/mcpClient";

async function run() {
  console.log("=== STARTING FULL END-TO-END INTEGRATION TEST ===");

  console.log("1. Connecting to DB...");
  await connectDB();

  console.log("2. Uploading test manual to langgraph-backend (port 5100)...");
  
  const boundary = "----TestBoundary";
  const fileContent = "This is a custom PLC device manual. The error code 999 indicates CPU temperature limit exceeded.";
  const filename = "plc_custom_manual.txt";

  const payload = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: text/plain`,
    "",
    fileContent,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  const uploadRes = await fetch("http://localhost:5100/api/extraction/upload", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    body: payload
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("Upload failed status:", uploadRes.status, errText);
    process.exit(1);
  }

  const uploadData = await uploadRes.json() as { documentId: string; message: string };
  console.log("Upload response:", uploadData);
  assert(uploadData.documentId, "Expected a valid documentId returned.");

  console.log("3. Waiting 6 seconds for Document Parsing Agent queues to process document chunks & embeddings...");
  await new Promise((resolve) => setTimeout(resolve, 6000));

  console.log("4. Connecting MCP Client to retrieve tools...");
  const mcpClient = await createMcpClient();

  console.log("5. Invoking get_grounding_context tool with query 'error code 999'...");
  const toolRes = await mcpClient.callTool({
    name: "get_grounding_context",
    arguments: { query: "error code 999" }
  });

  console.log("Tool execution returned response content:");
  console.log(JSON.stringify(toolRes, null, 2));

  // Verify search results contain our text
  const textContent = (toolRes.content as any)[0].text;
  const parsed = JSON.parse(textContent);
  
  assert(parsed.success === true, "Expected tool execution to be successful.");
  assert(parsed.results && parsed.results.length > 0, "Expected search results to return grounding context.");
  
  const matchedChunk = parsed.results[0];
  console.log("\nFound matched chunk content:", matchedChunk.content);
  console.log("Source citation reference:", matchedChunk.sourceReference);
  
  assert(matchedChunk.content.includes("error code 999"), "Grounding context must contain uploaded info.");
  
  console.log("\n✅ E2E INTEGRATION TEST PASSED SUCCESSFULLY!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ E2E Integration test failed:", err);
  process.exit(1);
});

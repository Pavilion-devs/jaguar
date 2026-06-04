import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOLS } from "./tools";

const server = new McpServer({
  name: "jaguar",
  version: "0.1.0",
});

// Register every tool from the shared registry. The HTTP route (apps/web) serves
// the exact same TOOLS array, so the two transports never drift.
for (const tool of TOOLS) {
  server.tool(tool.name, tool.description, tool.schema.shape, async (args) =>
    tool.handler(args as Record<string, unknown>, { operatorSecretProvided: null }),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);

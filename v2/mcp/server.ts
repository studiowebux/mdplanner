// MCP server factory — creates a transport-agnostic McpServer instance.
// Registers tool modules. Each module is a thin wrapper over v2 services.
// Pattern: Factory Method

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { registerMilestoneTools } from "./tools/milestones.ts";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  registerMilestoneTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

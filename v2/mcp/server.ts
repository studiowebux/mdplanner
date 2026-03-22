// MCP server factory — creates a transport-agnostic McpServer instance.
// Registers tool modules. Each module is a thin wrapper over v2 services.
// Pattern: Factory Method

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { registerMilestoneTools } from "./tools/milestones.ts";
import { registerNoteTools } from "./tools/notes.ts";
import { registerPeopleTools } from "./tools/people.ts";
import { registerPortfolioTools } from "./tools/portfolio.ts";
import { registerTaskTools } from "./tools/tasks.ts";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  registerMilestoneTools(server);
  registerNoteTools(server);
  registerPeopleTools(server);
  registerPortfolioTools(server);
  registerTaskTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

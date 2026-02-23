/**
 * MCP server setup and transport.
 * Wires all tool and resource modules into the McpServer instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ProjectManager } from "../lib/project-manager.ts";
import { VERSION } from "../lib/version.ts";
import { registerTaskTools } from "./tools/tasks.ts";
import { registerNoteTools } from "./tools/notes.ts";
import { registerGoalTools } from "./tools/goals.ts";
import { registerMeetingTools } from "./tools/meetings.ts";
import { registerPeopleTools } from "./tools/people.ts";
import { registerProjectTools } from "./tools/project.ts";
import { registerSearchTools } from "./tools/search.ts";
import { registerResources } from "./resources.ts";

export async function startMcpServer(pm: ProjectManager): Promise<void> {
  const server = new McpServer({
    name: "mdplanner",
    version: VERSION,
  });

  registerTaskTools(server, pm);
  registerNoteTools(server, pm);
  registerGoalTools(server, pm);
  registerMeetingTools(server, pm);
  registerPeopleTools(server, pm);
  registerProjectTools(server, pm);
  registerSearchTools(server, pm);
  registerResources(server, pm);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

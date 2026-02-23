/**
 * MCP tools for people registry operations.
 * Tools: list_people
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProjectManager } from "../../lib/project-manager.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerPeopleTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_people",
    {
      description: "List all people in the project's people registry.",
      inputSchema: {},
    },
    async () => {
      const people = await parser.readPeople();
      return ok(people);
    },
  );
}

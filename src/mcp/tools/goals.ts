/**
 * MCP tools for goal operations.
 * Tools: list_goals
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerGoalTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_goals",
    {
      description:
        "List all goals in the project. Optionally filter by status.",
      inputSchema: {
        status: z.enum([
          "planning",
          "on-track",
          "at-risk",
          "late",
          "success",
          "failed",
        ]).optional().describe("Filter by goal status"),
      },
    },
    async ({ status }) => {
      const goals = await parser.readGoals();
      const filtered = status
        ? goals.filter((g) => g.status === status)
        : goals;
      return ok(filtered);
    },
  );
}

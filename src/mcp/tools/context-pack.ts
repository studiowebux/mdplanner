/**
 * MCP tool for the agent context-pack.
 * Tool: get_context_pack
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { assembleContextPack } from "../../lib/context-pack.ts";
import { ok } from "./utils.ts";

export function registerContextPackTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "get_context_pack",
    {
      description:
        "Single-call agent boot. Returns people, active milestone, in-progress tasks, " +
        "top-10 todo tasks, most recent progress note excerpt, and " +
        "decision/architecture/constraint note titles. " +
        "Replaces 8+ sequential MCP calls from Phase 1 Boot.",
      inputSchema: {
        project: z.string().optional().describe(
          "Project name to scope all entities (e.g. 'MD Planner')",
        ),
        milestone: z.string().optional().describe(
          "Milestone name. Defaults to the most recently created open milestone.",
        ),
      },
    },
    async ({ project, milestone }) => {
      const pack = await assembleContextPack(parser, { project, milestone });
      return ok(pack);
    },
  );
}

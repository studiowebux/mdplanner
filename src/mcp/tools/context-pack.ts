// MCP tool for the agent context-pack: get_context_pack.
// Thin wrapper over the context-pack service (assembleContextPack). The input
// shape reuses ContextPackQuerySchema so the query contract lives in one place.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { ContextPackQuerySchema } from "../../types/context-pack.types.ts";
import { assembleContextPack } from "../../services/context-pack.service.ts";
import { ok } from "../utils.ts";

export function registerContextPackTools(server: McpServer): void {
  server.registerTool(
    "get_context_pack",
    {
      description:
        "Single-call agent boot. Returns people, active milestone, in-progress " +
        "tasks, top-10 todo tasks, most recent progress note excerpt, " +
        "decision/architecture/constraint/feature/investigation note titles, a " +
        "summary, and a suggested next action. Replaces 8+ sequential MCP calls.",
      inputSchema: {
        project: ContextPackQuerySchema.shape.project.describe(
          "Project name to scope all entities (e.g. 'MD Planner')",
        ),
        milestone: ContextPackQuerySchema.shape.milestone.describe(
          "Milestone name. Defaults to the most recently created open milestone.",
        ),
      },
    },
    async ({ project, milestone }) =>
      ok(await assembleContextPack({ project, milestone })),
  );
}

export const contextPackModule = defineMcpModule({
  feature: null,
  register: registerContextPackTools,
});

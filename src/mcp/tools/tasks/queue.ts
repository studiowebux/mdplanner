// MCP task tools — queue + claim maintenance:
//   get_next_task, sweep_stale_claims.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SweepStaleClaimsInputSchema } from "../../../types/task.types.ts";
import { getPeopleService } from "../../../singletons/services.ts";
import { ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskQueueTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service } = ctx;

  // ── get_next_task ───────────────────────────────────────────────────────
  server.registerTool(
    "get_next_task",
    {
      description:
        "Find the highest-priority ready task matching an agent's skills. " +
        "Cross-references task tags with the agent's skills, " +
        "sorted by priority. Falls back to any ready task. " +
        "Returns one task or null.",
      inputSchema: {
        agent_id: z.string().describe("Person ID of the agent"),
        project: z.string().optional().describe(
          "Filter by project name (matches task project)",
        ),
      },
    },
    async ({ agent_id, project }) => {
      const person = await getPeopleService().getById(agent_id);
      const skills = person?.skills ?? [];

      const task = await service.getNextTask(agent_id, skills);
      if (!task) return ok(null);
      if (
        project && (task.project ?? "").toLowerCase() !== project.toLowerCase()
      ) {
        return ok(null);
      }
      return ok(task);
    },
  );

  // ── sweep_stale_claims ──────────────────────────────────────────────────
  server.registerTool(
    "sweep_stale_claims",
    {
      description:
        "Release tasks whose claim has expired. Scans In Progress tasks " +
        "where claimedAt + TTL has passed, moves them back to Todo, clears " +
        "claimedBy/claimedAt. Returns the list of released task IDs.",
      inputSchema: {
        ttl_minutes: SweepStaleClaimsInputSchema.shape.ttlMinutes.describe(
          "Claim TTL in minutes (default: 60). Tasks claimed longer ago are released.",
        ),
      },
    },
    async ({ ttl_minutes }) => {
      const released = await service.sweepStaleClaims(ttl_minutes ?? 60);
      return ok({ released, count: released.length });
    },
  );
}

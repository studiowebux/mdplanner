// MCP task tools — assignment + batch lifecycle:
//   claim_task, move_task, batch_update_tasks.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  BatchUpdateItemSchema,
  ClaimTaskInputSchema,
  MoveTaskInputSchema,
  TaskSchema,
} from "../../../types/task.types.ts";
import { ClaimConflictError } from "../../../services/task.service.ts";
import { err, ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskWorkflowTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  // ── claim_task ──────────────────────────────────────────────────────────
  server.registerTool(
    "claim_task",
    {
      description:
        "Atomically claim a task: move it to 'In Progress' and assign it. " +
        "Fails with CLAIM_CONFLICT if the task is not in the expected section " +
        "(default: 'Todo'). Use this instead of update_task when multiple " +
        "agents may compete for the same task.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...ClaimTaskInputSchema.shape,
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match.",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full claimed task (default: false — returns only { id, success })",
        ),
      },
    },
    async (
      { id, assignee, expectedSection, expected_revision, withResult },
    ) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      try {
        if (expected_revision !== undefined) {
          if (guard.task.revision !== expected_revision) {
            return err(
              `REVISION_CONFLICT: expected revision ${expected_revision} but task is at revision ${guard.task.revision}`,
            );
          }
        }
        const task = await service.claimTask(id, assignee, expectedSection);
        if (!task) return err(`Task '${id}' not found`);
        return ok(
          withResult ? { id, success: true, task } : { id, success: true },
        );
      } catch (e) {
        if (e instanceof ClaimConflictError) return err(e.message);
        throw e;
      }
    },
  );

  // ── move_task ───────────────────────────────────────────────────────────
  server.registerTool(
    "move_task",
    {
      description: "Move a task to a different section (column).",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...MoveTaskInputSchema.shape,
      },
    },
    async ({ id, section }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const task = await service.moveTask(id, section);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── batch_update_tasks ──────────────────────────────────────────────────
  server.registerTool(
    "batch_update_tasks",
    {
      description:
        "Update multiple tasks in a single call. Each entry follows the " +
        "same fields as update_task. Returns per-task success/error results. " +
        "Use this to move a batch to In Progress, add comments to several " +
        "tasks, or move a batch to Done in one round-trip.",
      inputSchema: {
        updates: z.array(BatchUpdateItemSchema).min(1).max(50).describe(
          "Array of task updates (1-50). Each entry needs at least an id.",
        ),
      },
    },
    async ({ updates }) => {
      // Per-id archive guard: archived rows fail with a clear error;
      // non-archived rows go through service.batchUpdate normally.
      const archivedFailures: { id: string; success: false; error: string }[] =
        [];
      const liveUpdates: typeof updates = [];
      for (const u of updates) {
        const current = await service.getById(u.id);
        if (current && current.archived === true) {
          archivedFailures.push({
            id: u.id,
            success: false,
            error: `Task '${u.id}' is archived`,
          });
        } else {
          liveUpdates.push(u);
        }
      }
      const result = liveUpdates.length > 0
        ? await service.batchUpdate(liveUpdates)
        : { succeeded: [], failed: [] };
      return ok({
        updated: result.succeeded.length,
        total: updates.length,
        results: [
          ...result.succeeded.map((s) => ({ id: s.id, success: true })),
          ...result.failed.map((f) => ({
            id: f.id,
            success: false,
            error: f.error,
          })),
          ...archivedFailures,
        ],
      });
    },
  );
}

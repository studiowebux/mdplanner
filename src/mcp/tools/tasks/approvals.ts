// MCP task tools — human review workflow:
//   request_approval, approve_task, reject_task, list_pending_approvals.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ApproveTaskInputSchema,
  RejectTaskInputSchema,
  RequestApprovalInputSchema,
  TaskSchema,
} from "../../../types/task.types.ts";
import { err, ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskApprovalTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  // ── request_approval ────────────────────────────────────────────────────
  server.registerTool(
    "request_approval",
    {
      description:
        "Submit a task for human review. Attaches a structured summary and moves the task to " +
        "'Pending Review'. At the next boot session the verdict will appear in inProgress " +
        "tasks (if rejected) or the task will be in Done (if approved).",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...RequestApprovalInputSchema.shape,
      },
    },
    async ({ id, requestedBy, summary, commitHash, artifactUrls }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const task = await service.requestApproval(
        id,
        requestedBy,
        summary,
        commitHash,
        artifactUrls,
      );
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "Pending Review" });
    },
  );

  // ── approve_task ────────────────────────────────────────────────────────
  server.registerTool(
    "approve_task",
    {
      description: "Approve a task in 'Pending Review'. Moves it to Done. " +
        "Typically called by the human owner or a delegated reviewer.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...ApproveTaskInputSchema.shape,
      },
    },
    async ({ id, decidedBy, feedback }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const task = await service.approveTask(id, decidedBy, feedback);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "Done" });
    },
  );

  // ── reject_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "reject_task",
    {
      description:
        "Reject a task in 'Pending Review'. Moves it back to In Progress. " +
        "Structured rejection type allows the agent to route without parsing prose feedback.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...RejectTaskInputSchema.shape,
      },
    },
    async ({ id, decidedBy, feedback, rejectionType }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const task = await service.rejectTask(
        id,
        decidedBy,
        feedback,
        rejectionType,
      );
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "In Progress" });
    },
  );

  // ── list_pending_approvals ──────────────────────────────────────────────
  server.registerTool(
    "list_pending_approvals",
    {
      description:
        "List all tasks in 'Pending Review' — the human owner's review queue. " +
        "Returns stubs: id, title, requestedBy, requestedAt, summary excerpt, commit hash.",
      inputSchema: {
        project: z.string().optional().describe(
          "Filter by project name (case-insensitive)",
        ),
      },
    },
    async ({ project }) => {
      const tasks = await service.list({
        section: "Pending Review",
        ...(project ? { project } : {}),
      });
      const stubs = tasks.map((t) => {
        const ar = t.approvalRequest;
        return {
          id: t.id,
          title: t.title,
          project: t.project,
          requestedBy: ar?.requestedBy,
          requestedAt: ar?.requestedAt,
          commitHash: ar?.commitHash,
          summaryExcerpt: ar?.summary?.slice(0, 200),
        };
      });
      return ok(stubs);
    },
  );
}

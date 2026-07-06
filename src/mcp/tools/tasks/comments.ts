// MCP task tools — comments + attachments:
//   add_task_comment, add_task_attachments.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AddAttachmentsInputSchema,
  AddCommentInputSchema,
  TaskSchema,
} from "../../../types/task.types.ts";
import { z } from "zod";
import { err, ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskCommentTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  // ── add_task_comment ────────────────────────────────────────────────────
  server.registerTool(
    "add_task_comment",
    {
      description:
        "Add a comment to a task's comment thread. Use this to track progress, note what was done, or record a commit hash. Comments are stored separately from the task description.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        comment: z.string().describe(
          "Comment text. E.g. '[v0.7.1] Fixed by commit abc1234 — ...'",
        ),
        author: AddCommentInputSchema.shape.author,
        metadata: AddCommentInputSchema.shape.metadata,
      },
    },
    async ({ id, comment, author, metadata }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const result = await service.addComment(
        id,
        comment,
        author ?? "Claude",
        metadata,
      );
      if (!result) return err(`Task '${id}' not found`);
      return ok({ success: true, commentId: result.id });
    },
  );

  // ── add_task_attachments ────────────────────────────────────────────────
  server.registerTool(
    "add_task_attachments",
    {
      description: "Add file attachment paths to a task's attachments field.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        paths: AddAttachmentsInputSchema.shape.paths,
      },
    },
    async ({ id, paths }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const task = await service.addAttachments(id, paths);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );
}

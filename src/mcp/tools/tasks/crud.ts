// MCP task tools — core CRUD + reads:
//   list_tasks, get_task, get_task_by_name, get_task_slim,
//   create_task, update_task, delete_task.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CreateTaskSchema,
  ListTaskOptionsSchema,
  TaskSchema,
  UpdateTaskSchema,
} from "../../../types/task.types.ts";
import {
  ClaimGuardError,
  RevisionConflictError,
} from "../../../services/task.service.ts";
import { err, ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskCrudTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  // ── list_tasks ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_tasks",
    {
      description:
        "List all tasks in the project. Filter by section, project, or milestone. " +
        "Archived tasks are excluded by default — pass archived: true to list archived only. " +
        "Pass slim: true when browsing to pick the next task — returns id, title, section, priority, tags, milestone, assignee only, cutting token usage by ~90%.",
      inputSchema: {
        ...ListTaskOptionsSchema.shape,
        priority: z.number().int().min(1).max(5).optional().describe(
          "Filter by priority level (1 = highest, 5 = lowest)",
        ),
        completed: z.boolean().optional().describe(
          "Filter by completion state (false = open only, true = completed only)",
        ),
        archived: z.boolean().optional().describe(
          "When true, return archived tasks only. When false or omitted, archived tasks are excluded.",
        ),
        slim: z.boolean().optional().describe(
          "Return minimal fields only: id, title, section, priority, tags, milestone, assignee. Use when browsing tasks to pick the next one.",
        ),
      },
    },
    async ({ priority, completed, archived, slim, ...options }) => {
      let tasks = archived
        ? await service.listArchived(options)
        : await service.list(options);
      if (priority !== undefined) {
        tasks = tasks.filter((t) => t.priority === priority);
      }
      if (completed !== undefined) {
        tasks = tasks.filter((t) => t.completed === completed);
      }
      if (slim) {
        return ok(tasks.map((t) => ({
          id: t.id,
          title: t.title,
          section: t.section,
          priority: t.priority,
          tags: t.tags,
          milestone: t.milestone,
          assignee: t.assignee,
        })));
      }
      return ok(tasks);
    },
  );

  // ── get_task ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_task",
    {
      description: "Get a single task by its ID.",
      inputSchema: { id: TaskSchema.shape.id.describe("Task ID") },
    },
    async ({ id }) => {
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      return ok(task);
    },
  );

  // ── get_task_by_name ────────────────────────────────────────────────────
  server.registerTool(
    "get_task_by_name",
    {
      description:
        "Get a task by its title (case-insensitive). Prefer this over list_tasks when the exact title is known.",
      inputSchema: {
        name: z.string().describe("Task title"),
      },
    },
    async ({ name }) => {
      const task = await service.getByName(name);
      if (!task) return err(`Task '${name}' not found`);
      return ok(task);
    },
  );

  // ── get_task_slim ───────────────────────────────────────────────────────
  server.registerTool(
    "get_task_slim",
    {
      description:
        "Get a minimal view of a task by ID. Returns only id, title, description, section, milestone, blockedBy, and the last N comments. " +
        "Omits config fields, timestamps, revision, assignee, effort, dates, and files. " +
        "Use instead of get_task to reduce token usage when full task details are not needed.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        last_comments: z.number().int().min(0).max(20).optional().describe(
          "Number of most-recent comments to include (default: 5, max: 20)",
        ),
      },
    },
    async ({ id, last_comments }) => {
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      const n = last_comments ?? 5;
      const comments = task.comments ?? [];
      return ok({
        id: task.id,
        title: task.title,
        description: task.description?.join("\n"),
        section: task.section,
        milestone: task.milestone,
        blockedBy: task.blocked_by,
        comments: comments.slice(-n),
      });
    },
  );

  // ── create_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_task",
    {
      description: "Create a new task in the project.",
      inputSchema: {
        ...CreateTaskSchema.shape,
        description: z.string().optional().describe(
          "Task description (markdown)",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full created task (default: false — returns only { id })",
        ),
        claim: z.boolean().optional().describe(
          "Atomic create-and-claim. Sets section to 'In Progress', " +
            "records claimedBy/claimedAt. Requires assignee.",
        ),
      },
    },
    async ({ description, withResult, claim, ...fields }) => {
      if (claim && !fields.assignee) {
        return err("claim requires assignee to be set");
      }

      const data = {
        ...fields,
        ...(description ? { description: description.split("\n") } : {}),
        ...(claim
          ? {
            section: "In Progress",
            claimedBy: fields.assignee,
            claimedAt: new Date().toISOString(),
          }
          : {}),
      };

      const task = await service.create(data);
      return ok(withResult ? task : { id: task.id });
    },
  );

  // ── update_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_task",
    {
      description: "Update an existing task's fields.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...UpdateTaskSchema.shape,
        description: z.string().optional().describe(
          "Full replacement description (markdown)",
        ),
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match. Use for optimistic locking in multi-agent scenarios.",
        ),
        agent_id: z.string().optional().describe(
          "Person ID of the calling agent. When provided, In Progress tasks claimed by a different agent are rejected with CLAIM_GUARD error.",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full updated task (default: false — returns only { id, success })",
        ),
      },
    },
    async (
      { id, description, expected_revision, agent_id, withResult, ...fields },
    ) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      try {
        const data = {
          ...fields,
          ...(description !== undefined
            ? { description: description.split("\n") }
            : {}),
        };
        const task = await service.update(
          id,
          data,
          expected_revision,
          agent_id,
        );
        if (!task) return err(`Task '${id}' not found`);
        return ok(
          withResult ? { id, success: true, task } : { id, success: true },
        );
      } catch (e) {
        if (
          e instanceof RevisionConflictError ||
          e instanceof ClaimGuardError
        ) {
          return err(`${e.code}: ${e.message}`);
        }
        throw e;
      }
    },
  );

  // ── delete_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_task",
    {
      description:
        "Soft-delete (archive) a task by its ID. Archived tasks are excluded from list_tasks by default. To list them pass `archived: true`. Already-archived tasks return an err — use a future hard-delete tool for permanent removal.",
      inputSchema: { id: TaskSchema.shape.id.describe("Task ID") },
    },
    async ({ id }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const success = await service.delete(id);
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );
}

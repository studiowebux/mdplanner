/**
 * MCP tools for task operations.
 * Tools: list_tasks, get_task, create_task, update_task, delete_task,
 *        add_task_comment, add_task_attachments, move_task, claim_task
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { Task } from "../../lib/types.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

function findTaskById(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.children) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function registerTaskTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_tasks",
    {
      description:
        "List all tasks in the project. Filter by section, project, or milestone.",
      inputSchema: {
        section: z.string().optional().describe(
          "Filter by section name e.g. 'Todo', 'In Progress', 'Done'",
        ),
        project: z.string().optional().describe(
          "Filter by project name (matches config.project)",
        ),
        milestone: z.string().optional().describe(
          "Filter by milestone name (matches config.milestone)",
        ),
        assignee: z.string().optional().describe(
          "Filter by assignee person ID (matches config.assignee)",
        ),
        priority: z.number().int().min(1).max(5).optional().describe(
          "Filter by priority level (1 = highest, 5 = lowest)",
        ),
        completed: z.boolean().optional().describe(
          "Filter by completion state (false = open only, true = completed only)",
        ),
        tags: z.array(z.string()).optional().describe(
          "Filter by tags — returns tasks that have ANY of the given tags",
        ),
        ready: z.boolean().optional().describe(
          "Dependency-aware filter. true = tasks whose blocked_by are all Done or completed. false = tasks with open blockers. Evaluated after all other filters.",
        ),
      },
    },
    async (
      {
        section,
        project,
        milestone,
        assignee,
        priority,
        completed,
        tags,
        ready,
      },
    ) => {
      const tasks = await parser.readTasks();
      let flat = flattenTasks(tasks);
      if (section) {
        flat = flat.filter((t) =>
          t.section.toLowerCase() === section.toLowerCase()
        );
      }
      if (project) {
        flat = flat.filter((t) =>
          (t.config?.project ?? "").toLowerCase() === project.toLowerCase()
        );
      }
      if (milestone) {
        flat = flat.filter((t) =>
          (t.config?.milestone ?? "").toLowerCase() === milestone.toLowerCase()
        );
      }
      if (assignee) {
        flat = flat.filter((t) => t.config?.assignee === assignee);
      }
      if (priority !== undefined) {
        flat = flat.filter((t) => t.config?.priority === priority);
      }
      if (completed !== undefined) {
        flat = flat.filter((t) => t.completed === completed);
      }
      if (tags?.length) {
        const lowerTags = tags.map((t) => t.toLowerCase());
        flat = flat.filter((t) =>
          (t.config?.tags ?? []).some((tag: string) =>
            lowerTags.includes(tag.toLowerCase())
          )
        );
      }
      if (ready !== undefined) {
        // Build lookup of all tasks to resolve blocker status
        const allFlat = flattenTasks(tasks);
        const taskById = new Map(allFlat.map((t) => [t.id, t]));
        flat = flat.filter((t) => {
          const blockers = t.config?.blocked_by ?? [];
          if (blockers.length === 0) return ready; // no blockers = ready
          const allResolved = blockers.every((bid: string) => {
            const blocker = taskById.get(bid);
            return !blocker || blocker.completed ||
              blocker.section.toLowerCase() === "done";
          });
          return ready ? allResolved : !allResolved;
        });
      }
      return ok(flat);
    },
  );

  server.registerTool(
    "get_task",
    {
      description: "Get a single task by its ID.",
      inputSchema: { id: z.string().describe("Task ID") },
    },
    async ({ id }) => {
      const tasks = await parser.readTasks();
      const task = findTaskById(tasks, id);
      if (!task) return err(`Task '${id}' not found`);
      return ok(task);
    },
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a new task in the project.",
      inputSchema: {
        title: z.string().describe("Task title"),
        section: z.string().optional().describe(
          "Section / status (default: 'Todo')",
        ),
        description: z.string().optional().describe(
          "Task description (markdown)",
        ),
        assignee: z.string().optional(),
        due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
        priority: z.number().int().min(1).max(5).optional(),
        effort: z.number().int().optional().describe(
          "Effort estimate (story points or hours)",
        ),
        tags: z.array(z.string()).optional(),
        milestone: z.string().optional().describe("Milestone name"),
        project: z.string().optional().describe("Project name"),
        planned_start: z.string().optional().describe(
          "Planned start date (YYYY-MM-DD)",
        ),
        planned_end: z.string().optional().describe(
          "Planned end date (YYYY-MM-DD)",
        ),
        parentId: z.string().optional().describe(
          "Parent task ID — creates this task as a subtask",
        ),
      },
    },
    async (
      {
        title,
        section,
        description,
        assignee,
        due_date,
        priority,
        effort,
        tags,
        milestone,
        project,
        planned_start,
        planned_end,
        parentId,
      },
    ) => {
      const id = await parser.addTask({
        title,
        completed: false,
        section: section ?? "Todo",
        description: description ? description.split("\n") : undefined,
        config: {
          ...(assignee && { assignee }),
          ...(due_date && { due_date }),
          ...(priority != null && { priority }),
          ...(effort != null && { effort }),
          ...(tags?.length && { tags }),
          ...(milestone && { milestone }),
          ...(project && { project }),
          ...(planned_start && { planned_start }),
          ...(planned_end && { planned_end }),
        },
        ...(parentId && { parentId }),
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update an existing task's fields.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        title: z.string().optional(),
        section: z.string().optional(),
        completed: z.boolean().optional(),
        description: z.string().optional().describe(
          "Full replacement description (markdown)",
        ),
        assignee: z.string().optional(),
        due_date: z.string().optional(),
        priority: z.number().int().min(1).max(5).optional(),
        effort: z.number().int().optional().describe(
          "Effort estimate (story points or hours)",
        ),
        tags: z.array(z.string()).optional(),
        milestone: z.string().optional().describe("Milestone name"),
        project: z.string().optional().describe("Project name"),
        blocked_by: z.array(z.string()).optional().describe(
          "List of task IDs this task is blocked by",
        ),
        planned_start: z.string().optional().describe(
          "Planned start date (YYYY-MM-DD)",
        ),
        planned_end: z.string().optional().describe(
          "Planned end date (YYYY-MM-DD)",
        ),
        claimed_by: z.string().optional().describe(
          "Person ID of the agent actively working on this task",
        ),
        claimed_at: z.string().optional().describe(
          "ISO timestamp when the task was claimed",
        ),
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match. Use for optimistic locking in multi-agent scenarios.",
        ),
        agent_id: z.string().optional().describe(
          "Person ID of the calling agent. When provided, In Progress tasks claimed by a different agent are rejected with CLAIM_GUARD error.",
        ),
      },
    },
    async (
      {
        id,
        title,
        section,
        completed,
        description,
        assignee,
        due_date,
        priority,
        effort,
        tags,
        milestone,
        project,
        blocked_by,
        planned_start,
        planned_end,
        claimed_by,
        claimed_at,
        expected_revision,
        agent_id,
      },
    ) => {
      const current = await parser.readTask(id);
      if (!current) return err(`Task '${id}' not found`);

      // Optimistic locking: reject stale updates
      if (
        expected_revision !== undefined &&
        current.revision !== expected_revision
      ) {
        return err(
          `REVISION_CONFLICT: expected revision ${expected_revision} but task is at revision ${current.revision}`,
        );
      }

      // Claim guard: reject updates from non-owner agents on claimed tasks
      if (
        agent_id &&
        current.section === "In Progress" &&
        current.config.claimedBy &&
        current.config.claimedBy !== agent_id
      ) {
        return err(
          `CLAIM_GUARD: task '${id}' is claimed by '${current.config.claimedBy}', caller is '${agent_id}'`,
        );
      }
      const success = await parser.updateTask(id, {
        ...(title !== undefined && { title }),
        ...(section !== undefined && { section }),
        ...(completed !== undefined && { completed }),
        ...(description !== undefined && {
          description: description.split("\n"),
        }),
        config: {
          ...(assignee !== undefined && { assignee }),
          ...(due_date !== undefined && { due_date }),
          ...(priority !== undefined && { priority }),
          ...(effort !== undefined && { effort }),
          ...(tags !== undefined && { tags }),
          ...(milestone !== undefined && { milestone }),
          ...(project !== undefined && { project }),
          ...(blocked_by !== undefined && { blocked_by }),
          ...(planned_start !== undefined && { planned_start }),
          ...(planned_end !== undefined && { planned_end }),
          ...(claimed_by !== undefined && { claimedBy: claimed_by }),
          ...(claimed_at !== undefined && { claimedAt: claimed_at }),
        },
      });
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_task_comment",
    {
      description:
        "Add a comment to a task's comment thread. Use this to track progress, note what was done, or record a commit hash. Comments are stored separately from the task description.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        comment: z.string().describe(
          "Comment text. E.g. '[v0.7.1] Fixed by commit abc1234 — ...'",
        ),
        author: z.string().optional().describe(
          "Author name (defaults to 'Claude' when called from MCP)",
        ),
        metadata: z.record(z.unknown()).optional().describe(
          "Structured metadata for machine-readable progress. " +
            "Predefined keys: action (started|progress|completed|blocked|deferred), " +
            "commit, branch, files_changed, next_step",
        ),
      },
    },
    async ({ id, comment, author, metadata }) => {
      const result = await parser.addComment(
        id,
        comment,
        author ?? "Claude",
        metadata,
      );
      if (!result) return err(`Task '${id}' not found`);
      return ok({ success: true, commentId: result.id });
    },
  );

  server.registerTool(
    "add_task_attachments",
    {
      description:
        "Add file attachment paths to a task's attachments frontmatter field.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        paths: z.array(z.string()).describe(
          "List of file paths relative to the project directory (e.g. ['uploads/2026/03/01/file.pdf'])",
        ),
      },
    },
    async ({ id, paths }) => {
      if (!paths.length) return err("paths array must not be empty");
      const success = await parser.addAttachmentsToTask(id, paths);
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "move_task",
    {
      description:
        "Move a task to a different section (column). Optionally specify a position for ordered placement.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        section: z.string().describe(
          "Target section name (e.g. 'Todo', 'In Progress', 'Done')",
        ),
        position: z.number().int().min(0).optional().describe(
          "Zero-based position within the section (omit to append at end)",
        ),
      },
    },
    async ({ id, section, position }) => {
      let success: boolean;
      if (position !== undefined) {
        success = await parser.reorderTask(id, section, position);
      } else {
        success = await parser.updateTask(id, { section });
      }
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by its ID.",
      inputSchema: { id: z.string().describe("Task ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteTask(id);
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "claim_task",
    {
      description:
        "Atomically claim a task: move it to 'In Progress' and assign it. " +
        "Fails with CLAIM_CONFLICT if the task is not in the expected section " +
        "(default: 'Todo'). Use this instead of update_task when multiple " +
        "agents may compete for the same task.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        assignee: z.string().describe("Person ID of the claimant"),
        expected_section: z.string().optional().describe(
          "Section the task must be in to claim it (default: 'Todo')",
        ),
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match.",
        ),
      },
    },
    async ({ id, assignee, expected_section, expected_revision }) => {
      try {
        if (expected_revision !== undefined) {
          const current = await parser.readTask(id);
          if (!current) return err(`Task '${id}' not found`);
          if (current.revision !== expected_revision) {
            return err(
              `REVISION_CONFLICT: expected revision ${expected_revision} but task is at revision ${current.revision}`,
            );
          }
        }
        const task = await parser.claimTask(
          id,
          assignee,
          expected_section,
        );
        if (!task) return err(`Task '${id}' not found`);
        return ok({ success: true, task });
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("CLAIM_CONFLICT")) {
          return err(e.message);
        }
        throw e;
      }
    },
  );

  server.registerTool(
    "batch_update_tasks",
    {
      description:
        "Update multiple tasks in a single call. Each entry follows the " +
        "same fields as update_task. Returns per-task success/error results. " +
        "Use this to move a batch to In Progress, add comments to several " +
        "tasks, or move a batch to Done in one round-trip.",
      inputSchema: {
        updates: z.array(
          z.object({
            id: z.string().describe("Task ID"),
            title: z.string().optional(),
            section: z.string().optional(),
            completed: z.boolean().optional(),
            description: z.string().optional().describe(
              "Full replacement description (markdown)",
            ),
            assignee: z.string().optional(),
            due_date: z.string().optional(),
            priority: z.number().int().min(1).max(5).optional(),
            effort: z.number().int().optional(),
            tags: z.array(z.string()).optional(),
            milestone: z.string().optional(),
            project: z.string().optional(),
            blocked_by: z.array(z.string()).optional(),
            planned_start: z.string().optional(),
            planned_end: z.string().optional(),
            claimed_by: z.string().optional(),
            claimed_at: z.string().optional(),
            expected_revision: z.number().int().optional().describe(
              "Optimistic locking — reject if revision mismatch",
            ),
            agent_id: z.string().optional().describe(
              "Claim guard — reject if task claimed by different agent",
            ),
            comment: z.string().optional().describe(
              "If provided, add this comment to the task after updating",
            ),
            comment_author: z.string().optional().describe(
              "Author for the comment (default: 'Claude')",
            ),
            comment_metadata: z.record(z.unknown()).optional().describe(
              "Structured metadata for the inline comment",
            ),
          }),
        ).min(1).max(50).describe(
          "Array of task updates (1-50). Each entry needs at least an id.",
        ),
      },
    },
    async ({ updates }) => {
      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const entry of updates) {
        const current = await parser.readTask(entry.id);
        if (!current) {
          results.push({
            id: entry.id,
            success: false,
            error: `Task '${entry.id}' not found`,
          });
          continue;
        }

        // Optimistic locking
        if (
          entry.expected_revision !== undefined &&
          current.revision !== entry.expected_revision
        ) {
          results.push({
            id: entry.id,
            success: false,
            error:
              `REVISION_CONFLICT: expected ${entry.expected_revision}, actual ${current.revision}`,
          });
          continue;
        }

        // Claim guard
        if (
          entry.agent_id &&
          current.section === "In Progress" &&
          current.config.claimedBy &&
          current.config.claimedBy !== entry.agent_id
        ) {
          results.push({
            id: entry.id,
            success: false,
            error:
              `CLAIM_GUARD: task claimed by '${current.config.claimedBy}', caller is '${entry.agent_id}'`,
          });
          continue;
        }

        const success = await parser.updateTask(entry.id, {
          ...(entry.title !== undefined && { title: entry.title }),
          ...(entry.section !== undefined && { section: entry.section }),
          ...(entry.completed !== undefined && { completed: entry.completed }),
          ...(entry.description !== undefined && {
            description: entry.description.split("\n"),
          }),
          config: {
            ...(entry.assignee !== undefined && { assignee: entry.assignee }),
            ...(entry.due_date !== undefined && { due_date: entry.due_date }),
            ...(entry.priority !== undefined && { priority: entry.priority }),
            ...(entry.effort !== undefined && { effort: entry.effort }),
            ...(entry.tags !== undefined && { tags: entry.tags }),
            ...(entry.milestone !== undefined && {
              milestone: entry.milestone,
            }),
            ...(entry.project !== undefined && { project: entry.project }),
            ...(entry.blocked_by !== undefined && {
              blocked_by: entry.blocked_by,
            }),
            ...(entry.planned_start !== undefined && {
              planned_start: entry.planned_start,
            }),
            ...(entry.planned_end !== undefined && {
              planned_end: entry.planned_end,
            }),
            ...(entry.claimed_by !== undefined && {
              claimedBy: entry.claimed_by,
            }),
            ...(entry.claimed_at !== undefined && {
              claimedAt: entry.claimed_at,
            }),
          },
        });

        if (!success) {
          results.push({
            id: entry.id,
            success: false,
            error: `Failed to update task '${entry.id}'`,
          });
          continue;
        }

        if (entry.comment) {
          await parser.addComment(
            entry.id,
            entry.comment,
            entry.comment_author ?? "Claude",
            entry.comment_metadata,
          );
        }

        results.push({ id: entry.id, success: true });
      }

      const updated = results.filter((r) => r.success).length;
      return ok({ updated, total: updates.length, results });
    },
  );

  server.registerTool(
    "sweep_stale_claims",
    {
      description:
        "Release tasks whose claim has expired. Scans In Progress tasks " +
        "where claimedAt + TTL has passed, moves them back to Todo, clears " +
        "claimedBy/claimedAt, and adds a system comment. Returns the list " +
        "of released task IDs.",
      inputSchema: {
        ttl_minutes: z.number().int().min(1).optional().describe(
          "Claim TTL in minutes (default: 30). Tasks claimed longer ago are released.",
        ),
      },
    },
    async ({ ttl_minutes }) => {
      const ttl = (ttl_minutes ?? 30) * 60 * 1000;
      const now = Date.now();
      const tasks = await parser.readTasks();
      const flat = flattenTasks(tasks);
      const stale = flat.filter((t) => {
        if (t.section !== "In Progress") return false;
        const claimedAt = t.config?.claimedAt;
        if (!claimedAt) return false;
        return now - new Date(claimedAt).getTime() > ttl;
      });

      const released: string[] = [];
      for (const task of stale) {
        await parser.updateTask(task.id, {
          section: "Todo",
          config: {
            claimedBy: undefined,
            claimedAt: undefined,
          },
        });
        await parser.addComment(
          task.id,
          `[system] Claim expired — agent '${task.config.claimedBy}' unresponsive after ${
            ttl_minutes ?? 30
          }min TTL`,
        );
        released.push(task.id);
      }
      return ok({ released, count: released.length });
    },
  );
}

/** Flattens a task tree into a single-level array. */
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  for (const task of tasks) {
    result.push(task);
    if (task.children?.length) {
      result.push(...flattenTasks(task.children));
    }
  }
  return result;
}

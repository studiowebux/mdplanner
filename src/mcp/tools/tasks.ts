/**
 * MCP tools for task operations.
 * Tools: list_tasks, get_task, create_task, update_task, delete_task,
 *        add_task_comment, add_task_attachments, move_task
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
      },
    },
    async (
      { section, project, milestone, assignee, priority, completed, tags },
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
      },
    ) => {
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
      },
    },
    async ({ id, comment, author }) => {
      const result = await parser.addComment(
        id,
        comment,
        author ?? "Claude",
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

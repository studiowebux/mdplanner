/**
 * MCP tools for task operations.
 * Tools: list_tasks, get_task, create_task, update_task, delete_task
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
      },
    },
    async ({ section, project, milestone }) => {
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
        tag: z.array(z.string()).optional(),
        milestone: z.string().optional().describe("Milestone name"),
        project: z.string().optional().describe("Project name"),
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
        tag,
        milestone,
        project,
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
          ...(tag?.length && { tag }),
          ...(milestone && { milestone }),
          ...(project && { project }),
        },
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
        tag: z.array(z.string()).optional(),
        milestone: z.string().optional().describe("Milestone name"),
        project: z.string().optional().describe("Project name"),
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
        tag,
        milestone,
        project,
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
          ...(tag !== undefined && { tag }),
          ...(milestone !== undefined && { milestone }),
          ...(project !== undefined && { project }),
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
        "Append a comment to a task's description without replacing existing content. Use this to track progress, note what was done, or record a commit hash.",
      inputSchema: {
        id: z.string().describe("Task ID"),
        comment: z.string().describe(
          "Comment to append (markdown). E.g. '[v0.7.1] Fixed by commit abc1234 — ...'",
        ),
      },
    },
    async ({ id, comment }) => {
      const tasks = await parser.readTasks();
      const task = findTaskById(tasks, id);
      if (!task) return err(`Task '${id}' not found`);

      const existing = Array.isArray(task.description)
        ? task.description.join("\n")
        : (task.description ?? "");
      const timestamp = new Date().toISOString().split("T")[0];
      const appended = existing
        ? `${existing}\n\n---\n**${timestamp}**: ${comment}`
        : `**${timestamp}**: ${comment}`;

      const success = await parser.updateTask(id, {
        description: appended.split("\n"),
      });
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

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
        "List all tasks in the project. Optionally filter by section (status).",
      inputSchema: {
        section: z.string().optional().describe(
          "Filter by section name e.g. 'Todo', 'In Progress', 'Done'",
        ),
      },
    },
    async ({ section }) => {
      const tasks = await parser.readTasks();
      const flat = flattenTasks(tasks);
      const filtered = section
        ? flat.filter((t) => t.section.toLowerCase() === section.toLowerCase())
        : flat;
      return ok(filtered);
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
      },
    },
    async (
      { title, section, description, assignee, due_date, priority, tag },
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
        },
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

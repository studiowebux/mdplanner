// MCP task tools — time tracking:
//   create_time_entry, delete_time_entry, get_time_entries_for_task,
//   list_time_entries.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskSchema, TimeEntrySchema } from "../../../types/task.types.ts";
import { err, ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskTimeTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  // ── create_time_entry ───────────────────────────────────────────────────
  server.registerTool(
    "create_time_entry",
    {
      description:
        "Log time against a task. Appends a time entry to the task's time_entries array.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        date: TimeEntrySchema.shape.date,
        hours: TimeEntrySchema.shape.hours,
        person: TimeEntrySchema.shape.person,
        description: TimeEntrySchema.shape.description,
      },
    },
    async ({ id, date, hours, person, description }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const entry = await service.addTimeEntry(id, {
        date,
        hours,
        ...(person !== undefined ? { person } : {}),
        ...(description !== undefined ? { description } : {}),
      });
      if (!entry) return err(`Task '${id}' not found`);
      return ok({ success: true, entryId: entry.id });
    },
  );

  // ── delete_time_entry ───────────────────────────────────────────────────
  server.registerTool(
    "delete_time_entry",
    {
      description: "Remove a time entry from a task by entry ID.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        entryId: z.string().describe("Time entry ID"),
      },
    },
    async ({ id, entryId }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const success = await service.deleteTimeEntry(id, entryId);
      if (!success) {
        return err(`Time entry '${entryId}' not found on task '${id}'`);
      }
      return ok({ success: true });
    },
  );

  // ── get_time_entries_for_task ───────────────────────────────────────────
  server.registerTool(
    "get_time_entries_for_task",
    {
      description: "Return all time entries logged against a specific task.",
      inputSchema: { id: TaskSchema.shape.id.describe("Task ID") },
    },
    async ({ id }) => {
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      return ok(task.time_entries ?? []);
    },
  );

  // ── list_time_entries ───────────────────────────────────────────────────
  server.registerTool(
    "list_time_entries",
    {
      description:
        "List all time entries across every task, sorted by date descending. " +
        "Optionally filter by person ID or task project.",
      inputSchema: {
        person: z.string().optional().describe("Filter by person ID"),
        project: z.string().optional().describe(
          "Filter by task project name (case-insensitive)",
        ),
      },
    },
    async ({ person, project }) => {
      const tasks = await service.list(
        project ? { project } : {},
      );
      const entries = tasks.flatMap((t) =>
        (t.time_entries ?? []).map((e) => ({
          ...e,
          taskId: t.id,
          taskTitle: t.title,
        }))
      );
      const filtered = person
        ? entries.filter((e) => e.person === person)
        : entries;
      filtered.sort((a, b) => b.date.localeCompare(a.date));
      return ok(filtered);
    },
  );
}

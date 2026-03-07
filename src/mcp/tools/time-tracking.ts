/**
 * MCP tools for time entry operations.
 * Tools: list_time_entries, get_time_entries_for_task, create_time_entry, delete_time_entry
 * Pattern: Delegate — time entries are sub-fields on Task objects.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerTimeTrackingTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_time_entries",
    {
      description:
        "List all time entries across all tasks. Returns a map of taskId to entries array.",
      inputSchema: {},
    },
    async () => {
      const entries = await parser.readTimeEntries();
      const result: Record<string, unknown[]> = {};
      for (const [taskId, taskEntries] of entries) {
        result[taskId] = taskEntries;
      }
      return ok(result);
    },
  );

  server.registerTool(
    "get_time_entries_for_task",
    {
      description: "Get all time entries for a specific task.",
      inputSchema: {
        task_id: z.string().describe("Task ID to get time entries for"),
      },
    },
    async ({ task_id }) => {
      const entries = await parser.getTimeEntriesForTask(task_id);
      return ok(entries);
    },
  );

  server.registerTool(
    "create_time_entry",
    {
      description: "Log a time entry against a task. Returns the new entry ID.",
      inputSchema: {
        task_id: z.string().describe("Task ID to log time against"),
        date: z.string().optional().describe(
          "Date (YYYY-MM-DD, defaults to today)",
        ),
        hours: z.number().min(0).describe("Hours worked"),
        person: z.string().optional().describe(
          "Person name or ID who did the work",
        ),
        description: z.string().optional().describe(
          "What was done during this time",
        ),
      },
    },
    async ({ task_id, date, hours, person, description }) => {
      try {
        const entryId = await parser.addTimeEntry(task_id, {
          date: date ?? new Date().toISOString().slice(0, 10),
          hours,
          ...(person && { person }),
          ...(description && { description }),
        });
        return ok({ id: entryId });
      } catch (e) {
        if (e instanceof Error) return err(e.message);
        return err("Failed to create time entry");
      }
    },
  );

  server.registerTool(
    "delete_time_entry",
    {
      description: "Delete a time entry from a task.",
      inputSchema: {
        task_id: z.string().describe("Task ID the entry belongs to"),
        entry_id: z.string().describe("Time entry ID to delete"),
      },
    },
    async ({ task_id, entry_id }) => {
      const success = await parser.deleteTimeEntry(task_id, entry_id);
      if (!success) return err(`Time entry '${entry_id}' not found`);
      return ok({ success: true });
    },
  );
}

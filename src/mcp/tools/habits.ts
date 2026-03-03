/**
 * MCP tools for habit tracker operations.
 * Tools: list_habits, get_habit, create_habit, update_habit,
 *        mark_habit_complete, unmark_habit_complete, delete_habit
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerHabitTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_habits",
    {
      description: "List all habits in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readHabits()),
  );

  server.registerTool(
    "get_habit",
    {
      description: "Get a single habit by its ID.",
      inputSchema: { id: z.string().describe("Habit ID") },
    },
    async ({ id }) => {
      const habits = await parser.readHabits();
      const habit = habits.find((h) => h.id === id);
      if (!habit) return err(`Habit '${id}' not found`);
      return ok(habit);
    },
  );

  server.registerTool(
    "create_habit",
    {
      description: "Create a new habit to track.",
      inputSchema: {
        name: z.string().describe("Habit name"),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly"]).optional().describe(
          "Tracking frequency (default: daily)",
        ),
        target_days: z.array(z.string()).optional().describe(
          "Target days for weekly habits (e.g. ['Mon','Wed','Fri'])",
        ),
        notes: z.string().optional().describe("Markdown body notes"),
      },
    },
    async ({ name, description, frequency, target_days, notes }) => {
      const habit = await parser.addHabit({
        name,
        ...(description && { description }),
        frequency: frequency ?? "daily",
        ...(target_days?.length && { targetDays: target_days }),
        completions: [],
        ...(notes && { notes }),
      });
      return ok({ id: habit.id });
    },
  );

  server.registerTool(
    "update_habit",
    {
      description: "Update an existing habit's metadata.",
      inputSchema: {
        id: z.string().describe("Habit ID"),
        name: z.string().optional(),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly"]).optional(),
        target_days: z.array(z.string()).optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, target_days, ...rest }) => {
      const updated = await parser.updateHabit(id, {
        ...rest,
        ...(target_days !== undefined && { targetDays: target_days }),
      });
      if (!updated) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "mark_habit_complete",
    {
      description:
        "Mark a habit as completed for a specific date (defaults to today).",
      inputSchema: {
        id: z.string().describe("Habit ID"),
        date: z.string().optional().describe(
          "ISO date (YYYY-MM-DD, defaults to today)",
        ),
        note: z.string().optional().describe("Optional note for this day"),
      },
    },
    async ({ id, date, note }) => {
      const updated = await parser.markHabitComplete(id, date);
      if (!updated) return err(`Habit '${id}' not found`);
      // Attach per-day note if provided
      if (note) {
        const targetDate = date ??
          new Date().toISOString().split("T")[0];
        const dayNotes = { ...(updated.dayNotes ?? {}), [targetDate]: note };
        await parser.updateHabit(id, { dayNotes });
      }
      return ok({ success: true, streakCount: updated.streakCount });
    },
  );

  server.registerTool(
    "unmark_habit_complete",
    {
      description: "Remove a completion mark for a specific date.",
      inputSchema: {
        id: z.string().describe("Habit ID"),
        date: z.string().describe("ISO date (YYYY-MM-DD) to unmark"),
      },
    },
    async ({ id, date }) => {
      const updated = await parser.unmarkHabitComplete(id, date);
      if (!updated) return err(`Habit '${id}' not found`);
      return ok({ success: true, streakCount: updated.streakCount });
    },
  );

  server.registerTool(
    "delete_habit",
    {
      description: "Delete a habit by its ID.",
      inputSchema: { id: z.string().describe("Habit ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteHabit(id);
      if (!success) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );
}

// MCP tools for habit operations — thin wrappers over HabitService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHabitService } from "../../singletons/services.ts";
import {
  CreateHabitSchema,
  HabitSchema,
  ListHabitOptionsSchema,
  UpdateHabitSchema,
} from "../../types/habit.types.ts";
import { err, ok } from "../utils.ts";

export function registerHabitTools(server: McpServer): void {
  const service = getHabitService();

  server.registerTool(
    "list_habits",
    {
      description: "List all habits. Optionally filter by project.",
      inputSchema: ListHabitOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_habit",
    {
      description: "Get a single habit by its ID.",
      inputSchema: { id: HabitSchema.shape.id.describe("Habit ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Habit '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_habit_by_name",
    {
      description:
        "Get a habit by its title (case-insensitive). Prefer this over list_habits when the title is known.",
      inputSchema: { name: HabitSchema.shape.title.describe("Habit title") },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Habit '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_habit",
    {
      description: "Create a new habit to track.",
      inputSchema: CreateHabitSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_habit",
    {
      description: "Update an existing habit's fields.",
      inputSchema: {
        id: HabitSchema.shape.id.describe("Habit ID"),
        ...UpdateHabitSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_habit",
    {
      description: "Delete a habit by its ID.",
      inputSchema: { id: HabitSchema.shape.id.describe("Habit ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "mark_habit_complete",
    {
      description: "Mark a habit as complete for a specific date.",
      inputSchema: {
        id: HabitSchema.shape.id.describe("Habit ID"),
        date: z.string().describe("Date to mark complete (YYYY-MM-DD)"),
      },
    },
    async ({ id, date }) => {
      const item = await service.markComplete(id, date);
      if (!item) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "unmark_habit_complete",
    {
      description: "Remove a completion entry for a habit on a specific date.",
      inputSchema: {
        id: HabitSchema.shape.id.describe("Habit ID"),
        date: z.string().describe("Date to unmark (YYYY-MM-DD)"),
      },
    },
    async ({ id, date }) => {
      const item = await service.unmarkComplete(id, date);
      if (!item) return err(`Habit '${id}' not found`);
      return ok({ success: true });
    },
  );
}

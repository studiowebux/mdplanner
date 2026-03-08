/**
 * MCP tools for Strategic Levels Builder operations.
 * Tools: list_strategic_levels, get_strategic_levels,
 *        create_strategic_levels, update_strategic_levels,
 *        delete_strategic_levels, add_strategic_level,
 *        update_strategic_level, remove_strategic_level
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { STRATEGIC_LEVEL_ORDER } from "../../lib/types.ts";
import { err, ok } from "./utils.ts";

export function registerStrategicLevelsTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_strategic_levels",
    {
      description: "List all Strategic Levels builders.",
      inputSchema: {},
    },
    async () => ok(await parser.readStrategicLevelsBuilders()),
  );

  server.registerTool(
    "get_strategic_levels",
    {
      description: "Get a single Strategic Levels builder by its ID.",
      inputSchema: { id: z.string().describe("Builder ID") },
    },
    async ({ id }) => {
      const builders = await parser.readStrategicLevelsBuilders();
      const builder = builders.find((b) => b.id === id);
      if (!builder) return err(`Strategic Levels builder '${id}' not found`);
      return ok(builder);
    },
  );

  server.registerTool(
    "create_strategic_levels",
    {
      description: "Create a new Strategic Levels builder.",
      inputSchema: {
        title: z.string().describe("Builder title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const builder = await parser.addStrategicLevelsBuilder({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        levels: [],
      });
      return ok({ id: builder.id });
    },
  );

  server.registerTool(
    "update_strategic_levels",
    {
      description: "Update an existing Strategic Levels builder.",
      inputSchema: {
        id: z.string().describe("Builder ID"),
        title: z.string().optional(),
        date: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateStrategicLevelsBuilder(id, updates);
      if (!updated) return err(`Strategic Levels builder '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_strategic_levels",
    {
      description: "Delete a Strategic Levels builder by its ID.",
      inputSchema: { id: z.string().describe("Builder ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteStrategicLevelsBuilder(id);
      if (!success) return err(`Strategic Levels builder '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_strategic_level",
    {
      description: "Add a level entry to a Strategic Levels builder.",
      inputSchema: {
        builder_id: z.string().describe("Builder ID"),
        title: z.string().describe("Level title"),
        level: z.enum(STRATEGIC_LEVEL_ORDER).describe(
          "Level type (vision, mission, goals, objectives, strategies, tactics)",
        ),
        description: z.string().optional().describe("Level description"),
        parent_id: z.string().optional().describe("Parent level ID"),
      },
    },
    async ({ builder_id, title, level, description, parent_id }) => {
      const updated = await parser.addStrategicLevel(builder_id, {
        title,
        level,
        ...(description && { description }),
        ...(parent_id && { parentId: parent_id }),
      });
      if (!updated) {
        return err(`Strategic Levels builder '${builder_id}' not found`);
      }
      return ok({ success: true });
    },
  );

  server.registerTool(
    "update_strategic_level",
    {
      description: "Update a level entry within a Strategic Levels builder.",
      inputSchema: {
        builder_id: z.string().describe("Builder ID"),
        level_id: z.string().describe("Level entry ID"),
        title: z.string().optional(),
        description: z.string().optional(),
        level: z.enum(STRATEGIC_LEVEL_ORDER).optional(),
      },
    },
    async ({ builder_id, level_id, ...updates }) => {
      const updated = await parser.updateStrategicLevel(
        builder_id,
        level_id,
        updates,
      );
      if (!updated) {
        return err(
          `Strategic Levels builder '${builder_id}' or level '${level_id}' not found`,
        );
      }
      return ok({ success: true });
    },
  );

  server.registerTool(
    "remove_strategic_level",
    {
      description: "Remove a level entry from a Strategic Levels builder.",
      inputSchema: {
        builder_id: z.string().describe("Builder ID"),
        level_id: z.string().describe("Level entry ID"),
      },
    },
    async ({ builder_id, level_id }) => {
      const updated = await parser.removeStrategicLevel(builder_id, level_id);
      if (!updated) {
        return err(
          `Strategic Levels builder '${builder_id}' or level '${level_id}' not found`,
        );
      }
      return ok({ success: true });
    },
  );
}

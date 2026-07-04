// MCP tools for Strategic Levels Builder operations — thin wrappers over StrategicLevelsService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { z } from "zod";
import { getStrategicLevelsService } from "../../singletons/services.ts";
import {
  LEVEL_ORDER,
  StrategicLevelsBuildersSchema,
} from "../../types/strategic-levels.types.ts";
import { err, ok, projectSlim, slimParam } from "../utils.ts";

export function registerStrategicLevelsTools(server: McpServer): void {
  const service = getStrategicLevelsService();

  server.registerTool(
    "list_strategic_levels",
    {
      description: "List all Strategic Levels builders.",
      inputSchema: {
        q: z.string().optional().describe("Search query (matches title)"),
        date: z.string().optional().describe("Filter by date (YYYY-MM-DD)"),
        slim: slimParam,
      },
    },
    async ({ q, date, slim }) => {
      const items = await service.list({ q, date });
      return slim ? ok(projectSlim(items, ["title", "date"])) : ok(items);
    },
  );

  server.registerTool(
    "get_strategic_levels",
    {
      description: "Get a single Strategic Levels builder by its ID.",
      inputSchema: {
        id: StrategicLevelsBuildersSchema.shape.id.describe("Builder ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Strategic Levels builder '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_strategic_levels",
    {
      description: "Create a new Strategic Levels builder document.",
      inputSchema: {
        title: StrategicLevelsBuildersSchema.shape.title.describe(
          "Builder title",
        ),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const item = await service.create({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        levels: [],
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_strategic_levels",
    {
      description: "Update an existing Strategic Levels builder (title/date).",
      inputSchema: {
        id: StrategicLevelsBuildersSchema.shape.id.describe("Builder ID"),
        title: z.string().optional(),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ id, title, date }) => {
      const updated = await service.update(id, { title, date });
      if (!updated) return err(`Strategic Levels builder '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_strategic_levels",
    {
      description: "Delete a Strategic Levels builder by its ID.",
      inputSchema: {
        id: StrategicLevelsBuildersSchema.shape.id.describe("Builder ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
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
        level: z.enum(LEVEL_ORDER).describe(
          "Level type: vision, mission, goals, objectives, strategies, tactics",
        ),
        description: z.string().optional().describe("Level description"),
        parent_id: z.string().optional().describe("Parent level ID"),
        linked_tasks: z.array(z.string()).optional().describe(
          "Linked task IDs",
        ),
        linked_milestones: z.array(z.string()).optional().describe(
          "Linked milestone IDs",
        ),
      },
    },
    async (
      {
        builder_id,
        title,
        level,
        description,
        parent_id,
        linked_tasks,
        linked_milestones,
      },
    ) => {
      const builder = await service.getById(builder_id);
      if (!builder) {
        return err(`Strategic Levels builder '${builder_id}' not found`);
      }
      if (builder.archived === true) {
        return err(`Strategic Levels builder '${builder_id}' is archived`);
      }
      const maxOrder = builder.levels.reduce(
        (max, l) => Math.max(max, l.order),
        -1,
      );
      const newLevel = {
        id: `level_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        level,
        description,
        parentId: parent_id,
        linkedTasks: linked_tasks,
        linkedMilestones: linked_milestones,
        order: maxOrder + 1,
      };
      const updated = await service.update(builder_id, {
        levels: [...builder.levels, newLevel],
      });
      if (!updated) {
        return err(`Failed to add level to builder '${builder_id}'`);
      }
      return ok({ success: true, levelId: newLevel.id });
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
        level: z.enum(LEVEL_ORDER).optional(),
        parent_id: z.string().optional(),
        linked_tasks: z.array(z.string()).optional(),
        linked_milestones: z.array(z.string()).optional(),
      },
    },
    async (
      {
        builder_id,
        level_id,
        title,
        description,
        level,
        parent_id,
        linked_tasks,
        linked_milestones,
      },
    ) => {
      const builder = await service.getById(builder_id);
      if (!builder) {
        return err(`Strategic Levels builder '${builder_id}' not found`);
      }
      if (builder.archived === true) {
        return err(`Strategic Levels builder '${builder_id}' is archived`);
      }
      const idx = builder.levels.findIndex((l) => l.id === level_id);
      if (idx === -1) {
        return err(
          `Level '${level_id}' not found in builder '${builder_id}'`,
        );
      }
      const levels = [...builder.levels];
      levels[idx] = {
        ...levels[idx],
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(level !== undefined && { level }),
        ...(parent_id !== undefined && { parentId: parent_id }),
        ...(linked_tasks !== undefined && { linkedTasks: linked_tasks }),
        ...(linked_milestones !== undefined && {
          linkedMilestones: linked_milestones,
        }),
      };
      const updated = await service.update(builder_id, { levels });
      if (!updated) return err(`Failed to update level '${level_id}'`);
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
      const builder = await service.getById(builder_id);
      if (!builder) {
        return err(`Strategic Levels builder '${builder_id}' not found`);
      }
      if (builder.archived === true) {
        return err(`Strategic Levels builder '${builder_id}' is archived`);
      }
      const levels = builder.levels.filter((l) => l.id !== level_id);
      if (levels.length === builder.levels.length) {
        return err(
          `Level '${level_id}' not found in builder '${builder_id}'`,
        );
      }
      const updated = await service.update(builder_id, { levels });
      if (!updated) return err(`Failed to remove level '${level_id}'`);
      return ok({ success: true });
    },
  );
}

export const strategicLevelsModule = defineMcpModule({
  feature: "strategic_builder",
  register: registerStrategicLevelsTools,
});

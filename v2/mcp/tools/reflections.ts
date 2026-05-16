// MCP tools for reflection operations — thin wrappers over ReflectionService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getReflectionService } from "../../singletons/services.ts";
import {
  CreateReflectionSchema,
  ListReflectionOptionsSchema,
  ReflectionSchema,
  UpdateReflectionSchema,
} from "../../types/reflection.types.ts";
import { err, ok } from "../utils.ts";

export function registerReflectionTools(server: McpServer): void {
  const service = getReflectionService();

  server.registerTool(
    "list_reflections",
    {
      description:
        "List all reflections. Optionally filter by period, tag, date range, or search query.",
      inputSchema: ListReflectionOptionsSchema.shape,
    },
    async ({ q, period, tag, from, to }) => {
      const items = await service.list({ q, period, tag, from, to });
      return ok(items);
    },
  );

  server.registerTool(
    "get_reflection",
    {
      description: "Get a single reflection by its ID.",
      inputSchema: {
        id: ReflectionSchema.shape.id.describe("Reflection ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Reflection '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_reflection_by_name",
    {
      description:
        "Get a reflection by its title (case-insensitive). Prefer this over list_reflections when the title is known.",
      inputSchema: {
        name: ReflectionSchema.shape.title.describe("Reflection title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Reflection '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_reflection",
    {
      description: "Create a new reflection entry.",
      inputSchema: CreateReflectionSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_reflection",
    {
      description: "Update an existing reflection.",
      inputSchema: {
        id: ReflectionSchema.shape.id.describe("Reflection ID"),
        ...UpdateReflectionSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Reflection '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_reflection",
    {
      description: "Delete a reflection by ID.",
      inputSchema: {
        id: ReflectionSchema.shape.id.describe("Reflection ID"),
      },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Reflection '${id}' not found`);
      return ok({ success: true });
    },
  );
}

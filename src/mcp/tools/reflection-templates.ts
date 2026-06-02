// MCP tools for reflection template operations — thin wrappers over ReflectionTemplateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getReflectionTemplateService } from "../../singletons/services.ts";
import {
  CreateReflectionTemplateSchema,
  ListReflectionTemplateOptionsSchema,
  ReflectionTemplateSchema,
  UpdateReflectionTemplateSchema,
} from "../../types/reflection-template.types.ts";
import { err, ok } from "../utils.ts";

export function registerReflectionTemplateTools(server: McpServer): void {
  const service = getReflectionTemplateService();

  server.registerTool(
    "list_reflection_templates",
    {
      description:
        "List all reflection templates. Optionally filter by category, period, or search query.",
      inputSchema: ListReflectionTemplateOptionsSchema.shape,
    },
    async ({ q, category, period }) => {
      const items = await service.list({ q, category, period });
      return ok(items);
    },
  );

  server.registerTool(
    "get_reflection_template",
    {
      description: "Get a single reflection template by its ID.",
      inputSchema: {
        id: ReflectionTemplateSchema.shape.id.describe(
          "Reflection template ID",
        ),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Reflection template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_reflection_template_by_name",
    {
      description:
        "Get a reflection template by its name (case-insensitive). Prefer this over list_reflection_templates when the name is known.",
      inputSchema: {
        name: ReflectionTemplateSchema.shape.name.describe(
          "Reflection template name",
        ),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Reflection template '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_reflection_template",
    {
      description: "Create a new reflection template.",
      inputSchema: CreateReflectionTemplateSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_reflection_template",
    {
      description: "Update an existing reflection template.",
      inputSchema: {
        id: ReflectionTemplateSchema.shape.id.describe(
          "Reflection template ID",
        ),
        ...UpdateReflectionTemplateSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Reflection template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_reflection_template",
    {
      description: "Delete a reflection template by ID.",
      inputSchema: {
        id: ReflectionTemplateSchema.shape.id.describe(
          "Reflection template ID",
        ),
      },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Reflection template '${id}' not found`);
      return ok({ success: true });
    },
  );
}

// MCP tools for reflection template operations — thin wrappers over ReflectionTemplateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getReflectionTemplateService } from "../../singletons/services.ts";
import {
  CreateReflectionTemplateSchema,
  ListReflectionTemplateOptionsSchema,
  ReflectionTemplateSchema,
  UpdateReflectionTemplateSchema,
} from "../../types/reflection-template.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerReflectionTemplateTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getReflectionTemplateService(),
    notFoundLabel: "Reflection template",
    idParam: ReflectionTemplateSchema.shape.id.describe(
      "Reflection template ID",
    ),
    nameParam: ReflectionTemplateSchema.shape.name.describe(
      "Reflection template name",
    ),
    listSchema: ListReflectionTemplateOptionsSchema,
    createSchema: CreateReflectionTemplateSchema,
    updateSchema: UpdateReflectionTemplateSchema,
    mutationReturn: "entity",
    tools: {
      list: {
        name: "list_reflection_templates",
        description:
          "List all reflection templates. Optionally filter by category, period, or search query.",
      },
      get: {
        name: "get_reflection_template",
        description: "Get a single reflection template by its ID.",
      },
      getByName: {
        name: "get_reflection_template_by_name",
        description:
          "Get a reflection template by its name (case-insensitive). Prefer this over list_reflection_templates when the name is known.",
      },
      create: {
        name: "create_reflection_template",
        description: "Create a new reflection template.",
      },
      update: {
        name: "update_reflection_template",
        description: "Update an existing reflection template.",
      },
      delete: {
        name: "delete_reflection_template",
        description: "Delete a reflection template by ID.",
      },
    },
  });
}

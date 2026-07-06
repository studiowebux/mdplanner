// MCP tools for reflection operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getReflectionService } from "../../singletons/services.ts";
import {
  CreateReflectionSchema,
  ListReflectionOptionsSchema,
  ReflectionSchema,
  UpdateReflectionSchema,
} from "../../types/reflection.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerReflectionTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getReflectionService(),
    notFoundLabel: "Reflection",
    idParam: ReflectionSchema.shape.id.describe("Reflection ID"),
    nameParam: ReflectionSchema.shape.title.describe("Reflection title"),
    listSchema: ListReflectionOptionsSchema,
    createSchema: CreateReflectionSchema,
    updateSchema: UpdateReflectionSchema,
    mutationReturn: "entity",
    slimFields: ["title", "period", "date"],
    tools: {
      list: {
        name: "list_reflections",
        description:
          "List all reflections. Optionally filter by period, tag, date range, or search query. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_reflection",
        description: "Get a single reflection by its ID.",
      },
      getByName: {
        name: "get_reflection_by_name",
        description:
          "Get a reflection by its title (case-insensitive). Prefer this over list_reflections when the title is known.",
      },
      create: {
        name: "create_reflection",
        description: "Create a new reflection entry.",
      },
      update: {
        name: "update_reflection",
        description: "Update an existing reflection.",
      },
      delete: {
        name: "delete_reflection",
        description: "Delete a reflection by ID.",
      },
    },
  });
}

export const reflectionModule = defineMcpModule({
  feature: "reflection",
  register: registerReflectionTools,
});

// MCP tools for brainstorm template operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBrainstormTemplateService } from "../../singletons/services.ts";
import {
  BrainstormTemplateSchema,
  CreateBrainstormTemplateSchema,
  ListBrainstormTemplateOptionsSchema,
  UpdateBrainstormTemplateSchema,
} from "../../types/brainstorm-template.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerBrainstormTemplateTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getBrainstormTemplateService(),
    notFoundLabel: "Brainstorm template",
    idParam: BrainstormTemplateSchema.shape.id.describe(
      "Brainstorm template ID",
    ),
    nameParam: BrainstormTemplateSchema.shape.name.describe(
      "Brainstorm template name",
    ),
    listSchema: ListBrainstormTemplateOptionsSchema,
    createSchema: CreateBrainstormTemplateSchema,
    updateSchema: UpdateBrainstormTemplateSchema,
    mutationReturn: "id-success",
    slimFields: ["name"],
    tools: {
      list: {
        name: "list_brainstorm_templates",
        description:
          "List all brainstorm templates. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_brainstorm_template",
        description: "Get a single brainstorm template by its ID.",
      },
      getByName: {
        name: "get_brainstorm_template_by_name",
        description:
          "Get a brainstorm template by its title (case-insensitive).",
      },
      create: {
        name: "create_brainstorm_template",
        description: "Create a new brainstorm template.",
      },
      update: {
        name: "update_brainstorm_template",
        description: "Update an existing brainstorm template's fields.",
      },
      delete: {
        name: "delete_brainstorm_template",
        description: "Delete a brainstorm template by its ID.",
      },
    },
  });
}

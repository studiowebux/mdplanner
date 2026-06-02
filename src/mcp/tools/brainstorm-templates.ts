// MCP tools for brainstorm template operations — thin wrappers over BrainstormTemplateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBrainstormTemplateService } from "../../singletons/services.ts";
import {
  BrainstormTemplateSchema,
  CreateBrainstormTemplateSchema,
  ListBrainstormTemplateOptionsSchema,
  UpdateBrainstormTemplateSchema,
} from "../../types/brainstorm-template.types.ts";
import { err, ok } from "../utils.ts";

export function registerBrainstormTemplateTools(server: McpServer): void {
  const service = getBrainstormTemplateService();

  server.registerTool(
    "list_brainstorm_templates",
    {
      description: "List all brainstorm templates.",
      inputSchema: ListBrainstormTemplateOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_brainstorm_template",
    {
      description: "Get a single brainstorm template by its ID.",
      inputSchema: {
        id: BrainstormTemplateSchema.shape.id.describe(
          "Brainstorm template ID",
        ),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Brainstorm template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_brainstorm_template_by_name",
    {
      description: "Get a brainstorm template by its title (case-insensitive).",
      inputSchema: {
        name: BrainstormTemplateSchema.shape.name.describe(
          "Brainstorm template name",
        ),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Brainstorm template '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_brainstorm_template",
    {
      description: "Create a new brainstorm template.",
      inputSchema: CreateBrainstormTemplateSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_brainstorm_template",
    {
      description: "Update an existing brainstorm template's fields.",
      inputSchema: {
        id: BrainstormTemplateSchema.shape.id.describe(
          "Brainstorm template ID",
        ),
        ...UpdateBrainstormTemplateSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Brainstorm template '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_brainstorm_template",
    {
      description: "Delete a brainstorm template by its ID.",
      inputSchema: {
        id: BrainstormTemplateSchema.shape.id.describe(
          "Brainstorm template ID",
        ),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Brainstorm template '${id}' not found`);
      return ok({ success: true });
    },
  );
}

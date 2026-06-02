// MCP tools for MoSCoW prioritization operations — thin wrappers over MoscowService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMoscowService } from "../../singletons/services.ts";
import {
  CreateMoscowSchema,
  ListMoscowOptionsSchema,
  MoscowSchema,
  UpdateMoscowSchema,
} from "../../types/moscow.types.ts";
import { err, ok } from "../utils.ts";

export function registerMoscowTools(server: McpServer): void {
  const service = getMoscowService();

  server.registerTool(
    "list_moscow",
    {
      description:
        "List all MoSCoW prioritization boards. Optionally filter by project.",
      inputSchema: ListMoscowOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_moscow",
    {
      description: "Get a single MoSCoW board by its ID.",
      inputSchema: { id: MoscowSchema.shape.id.describe("MoSCoW board ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`MoSCoW board '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_moscow_by_name",
    {
      description:
        "Get a MoSCoW board by its title (case-insensitive). Prefer this over list_moscow when the title is known.",
      inputSchema: {
        name: MoscowSchema.shape.title.describe("MoSCoW board title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`MoSCoW board '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_moscow",
    {
      description: "Create a new MoSCoW prioritization board.",
      inputSchema: CreateMoscowSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_moscow",
    {
      description: "Update an existing MoSCoW board's fields.",
      inputSchema: {
        id: MoscowSchema.shape.id.describe("MoSCoW board ID"),
        ...UpdateMoscowSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`MoSCoW board '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_moscow",
    {
      description: "Delete a MoSCoW board by its ID.",
      inputSchema: { id: MoscowSchema.shape.id.describe("MoSCoW board ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`MoSCoW board '${id}' not found`);
      return ok({ success: true });
    },
  );
}

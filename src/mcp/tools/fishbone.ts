// MCP tools for fishbone diagram operations — thin wrappers over FishboneService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFishboneService } from "../../singletons/services.ts";
import {
  CreateFishboneSchema,
  FishboneSchema,
  ListFishboneOptionsSchema,
  UpdateFishboneSchema,
} from "../../types/fishbone.types.ts";
import { err, ok } from "../utils.ts";

export function registerFishboneTools(server: McpServer): void {
  const service = getFishboneService();

  server.registerTool(
    "list_fishbones",
    {
      description: "List all fishbone diagrams. Optionally filter by project.",
      inputSchema: ListFishboneOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_fishbone",
    {
      description: "Get a single fishbone diagram by its ID.",
      inputSchema: {
        id: FishboneSchema.shape.id.describe("Fishbone diagram ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Fishbone '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_fishbone_by_name",
    {
      description:
        "Get a fishbone diagram by its title (case-insensitive). Prefer this over list_fishbones when the title is known.",
      inputSchema: {
        name: FishboneSchema.shape.title.describe("Fishbone diagram title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Fishbone '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_fishbone",
    {
      description: "Create a new fishbone (Ishikawa) diagram.",
      inputSchema: CreateFishboneSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_fishbone",
    {
      description: "Update an existing fishbone diagram's fields.",
      inputSchema: {
        id: FishboneSchema.shape.id.describe("Fishbone diagram ID"),
        ...UpdateFishboneSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Fishbone '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_fishbone",
    {
      description: "Delete a fishbone diagram by its ID.",
      inputSchema: {
        id: FishboneSchema.shape.id.describe("Fishbone diagram ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Fishbone '${id}' not found`);
      return ok({ success: true });
    },
  );
}

// MCP tools for deal operations — thin wrappers over DealService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDealService } from "../../singletons/services.ts";
import {
  CreateDealSchema,
  DealSchema,
  ListDealOptionsSchema,
  UpdateDealSchema,
} from "../../types/deal.types.ts";
import { err, ok } from "../utils.ts";

export function registerDealTools(server: McpServer): void {
  const service = getDealService();

  server.registerTool(
    "list_deals",
    {
      description:
        "List all deals. Optionally filter by stage, company, or project.",
      inputSchema: ListDealOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_deal",
    {
      description: "Get a single deal by its ID.",
      inputSchema: { id: DealSchema.shape.id.describe("Deal ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Deal '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_deal_by_name",
    {
      description:
        "Get a deal by its title (case-insensitive). Prefer this over list_deals when the title is known.",
      inputSchema: { name: DealSchema.shape.title.describe("Deal title") },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Deal '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_deal",
    {
      description: "Create a new deal.",
      inputSchema: CreateDealSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_deal",
    {
      description: "Update an existing deal's fields.",
      inputSchema: {
        id: DealSchema.shape.id.describe("Deal ID"),
        ...UpdateDealSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Deal '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_deal",
    {
      description: "Delete a deal by its ID.",
      inputSchema: { id: DealSchema.shape.id.describe("Deal ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Deal '${id}' not found`);
      return ok({ success: true });
    },
  );
}

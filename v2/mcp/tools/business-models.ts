// MCP tools for business model operations — thin wrappers over BusinessModelService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBusinessModelService } from "../../singletons/services.ts";
import {
  BusinessModelSchema,
  CreateBusinessModelSchema,
  ListBusinessModelOptionsSchema,
  UpdateBusinessModelSchema,
} from "../../types/business-model.types.ts";
import { err, ok } from "../utils.ts";

export function registerBusinessModelTools(server: McpServer): void {
  const service = getBusinessModelService();

  server.registerTool(
    "list_business_models",
    {
      description: "List all business models. Optionally filter by project.",
      inputSchema: ListBusinessModelOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_business_model",
    {
      description: "Get a single business model by its ID.",
      inputSchema: {
        id: BusinessModelSchema.shape.id.describe("Business model ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Business model '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_business_model_by_name",
    {
      description:
        "Get a business model by its title (case-insensitive). Prefer this over list_business_models when the title is known.",
      inputSchema: {
        name: BusinessModelSchema.shape.title.describe("Business model title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Business model '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_business_model",
    {
      description: "Create a new business model canvas.",
      inputSchema: CreateBusinessModelSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_business_model",
    {
      description: "Update an existing business model's fields.",
      inputSchema: {
        id: BusinessModelSchema.shape.id.describe("Business model ID"),
        ...UpdateBusinessModelSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Business model '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_business_model",
    {
      description: "Delete a business model by its ID.",
      inputSchema: {
        id: BusinessModelSchema.shape.id.describe("Business model ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Business model '${id}' not found`);
      return ok({ success: true });
    },
  );
}

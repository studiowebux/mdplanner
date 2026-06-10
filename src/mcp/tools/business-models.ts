// MCP tools for business model operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBusinessModelService } from "../../singletons/services.ts";
import {
  BusinessModelSchema,
  CreateBusinessModelSchema,
  ListBusinessModelOptionsSchema,
  UpdateBusinessModelSchema,
} from "../../types/business-model.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerBusinessModelTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getBusinessModelService(),
    notFoundLabel: "Business model",
    idParam: BusinessModelSchema.shape.id.describe("Business model ID"),
    nameParam: BusinessModelSchema.shape.title.describe("Business model title"),
    listSchema: ListBusinessModelOptionsSchema,
    createSchema: CreateBusinessModelSchema,
    updateSchema: UpdateBusinessModelSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_business_models",
        description: "List all business models. Optionally filter by project.",
      },
      get: {
        name: "get_business_model",
        description: "Get a single business model by its ID.",
      },
      getByName: {
        name: "get_business_model_by_name",
        description:
          "Get a business model by its title (case-insensitive). Prefer this over list_business_models when the title is known.",
      },
      create: {
        name: "create_business_model",
        description: "Create a new business model canvas.",
      },
      update: {
        name: "update_business_model",
        description: "Update an existing business model's fields.",
      },
      delete: {
        name: "delete_business_model",
        description: "Delete a business model by its ID.",
      },
    },
  });
}

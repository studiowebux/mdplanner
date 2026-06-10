// MCP tools for MoSCoW board operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMoscowService } from "../../singletons/services.ts";
import {
  CreateMoscowSchema,
  ListMoscowOptionsSchema,
  MoscowSchema,
  UpdateMoscowSchema,
} from "../../types/moscow.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerMoscowTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getMoscowService(),
    notFoundLabel: "MoSCoW board",
    idParam: MoscowSchema.shape.id.describe("MoSCoW board ID"),
    nameParam: MoscowSchema.shape.title.describe("MoSCoW board title"),
    listSchema: ListMoscowOptionsSchema,
    createSchema: CreateMoscowSchema,
    updateSchema: UpdateMoscowSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_moscow",
        description:
          "List all MoSCoW prioritization boards. Optionally filter by project.",
      },
      get: {
        name: "get_moscow",
        description: "Get a single MoSCoW board by its ID.",
      },
      getByName: {
        name: "get_moscow_by_name",
        description:
          "Get a MoSCoW board by its title (case-insensitive). Prefer this over list_moscow when the title is known.",
      },
      create: {
        name: "create_moscow",
        description: "Create a new MoSCoW prioritization board.",
      },
      update: {
        name: "update_moscow",
        description: "Update an existing MoSCoW board's fields.",
      },
      delete: {
        name: "delete_moscow",
        description: "Delete a MoSCoW board by its ID.",
      },
    },
  });
}

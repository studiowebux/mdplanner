// MCP tools for brainstorm operations — thin wrappers over BrainstormService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBrainstormService } from "../../singletons/services.ts";
import {
  BrainstormSchema,
  CreateBrainstormSchema,
  ListBrainstormOptionsSchema,
  UpdateBrainstormSchema,
} from "../../types/brainstorm.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerBrainstormTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getBrainstormService(),
    notFoundLabel: "Brainstorm",
    idParam: BrainstormSchema.shape.id.describe("Brainstorm ID"),
    nameParam: BrainstormSchema.shape.title.describe("Brainstorm title"),
    listSchema: ListBrainstormOptionsSchema,
    createSchema: CreateBrainstormSchema,
    updateSchema: UpdateBrainstormSchema,
    mutationReturn: "entity",
    tools: {
      list: {
        name: "list_brainstorms",
        description:
          "List all brainstorms. Optionally filter by tag or search query.",
      },
      get: {
        name: "get_brainstorm",
        description: "Get a single brainstorm by its ID.",
      },
      getByName: {
        name: "get_brainstorm_by_name",
        description:
          "Get a brainstorm by its title (case-insensitive). Prefer this over list_brainstorms when the title is known.",
      },
      create: {
        name: "create_brainstorm",
        description: "Create a new brainstorm session.",
      },
      update: {
        name: "update_brainstorm",
        description: "Update an existing brainstorm.",
      },
      delete: {
        name: "delete_brainstorm",
        description: "Delete a brainstorm by ID.",
      },
    },
  });
}

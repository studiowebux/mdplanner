// SWOT MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSwotService } from "../../singletons/services.ts";
import {
  CreateSwotSchema,
  ListSwotOptionsSchema,
  SwotSchema,
  UpdateSwotSchema,
} from "../../types/swot.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerSwotTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getSwotService(),
    notFoundLabel: "SWOT",
    idParam: SwotSchema.shape.id.describe("SWOT ID"),
    nameParam: SwotSchema.shape.title.describe("SWOT title"),
    listSchema: ListSwotOptionsSchema,
    createSchema: CreateSwotSchema,
    updateSchema: UpdateSwotSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "project", "date"],
    tools: {
      list: {
        name: "list_swot",
        description:
          "List all SWOT analyses. Optionally filter by project or search query.",
      },
      get: {
        name: "get_swot",
        description: "Get a single SWOT analysis by its ID.",
      },
      getByName: {
        name: "get_swot_by_name",
        description:
          "Get a SWOT analysis by its title (case-insensitive). Prefer this over list when the name is known.",
      },
      create: {
        name: "create_swot",
        description:
          "Create a new SWOT analysis. Provide title and optionally date, quadrant items, and project.",
      },
      update: {
        name: "update_swot",
        description: "Update an existing SWOT analysis's fields.",
      },
      delete: {
        name: "delete_swot",
        description: "Delete a SWOT analysis by its ID.",
      },
    },
  });
}

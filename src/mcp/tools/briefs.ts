// MCP tools for brief operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBriefService } from "../../singletons/services.ts";
import {
  BriefSchema,
  CreateBriefSchema,
  ListBriefOptionsSchema,
  UpdateBriefSchema,
} from "../../types/brief.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerBriefTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getBriefService(),
    notFoundLabel: "Brief",
    idParam: BriefSchema.shape.id.describe("Brief ID"),
    nameParam: BriefSchema.shape.title.describe("Brief title"),
    listSchema: ListBriefOptionsSchema,
    createSchema: CreateBriefSchema,
    updateSchema: UpdateBriefSchema,
    mutationReturn: "entity",
    slimFields: ["title", "date"],
    tools: {
      list: {
        name: "list_briefs",
        description:
          "List all briefs. Optionally filter by search query. Pass slim: true to browse with a compact projection.",
      },
      get: { name: "get_brief", description: "Get a single brief by its ID." },
      getByName: {
        name: "get_brief_by_name",
        description:
          "Get a brief by its title (case-insensitive). Prefer this over list_briefs when the title is known.",
      },
      create: { name: "create_brief", description: "Create a new brief." },
      update: {
        name: "update_brief",
        description: "Update an existing brief.",
      },
      delete: { name: "delete_brief", description: "Delete a brief by ID." },
    },
  });
}

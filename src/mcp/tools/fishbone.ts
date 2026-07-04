// MCP tools for fishbone operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getFishboneService } from "../../singletons/services.ts";
import {
  CreateFishboneSchema,
  FishboneSchema,
  ListFishboneOptionsSchema,
  UpdateFishboneSchema,
} from "../../types/fishbone.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerFishboneTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getFishboneService(),
    notFoundLabel: "Fishbone",
    idParam: FishboneSchema.shape.id.describe("Fishbone diagram ID"),
    nameParam: FishboneSchema.shape.title.describe("Fishbone diagram title"),
    listSchema: ListFishboneOptionsSchema,
    createSchema: CreateFishboneSchema,
    updateSchema: UpdateFishboneSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "project"],
    tools: {
      list: {
        name: "list_fishbones",
        description:
          "List all fishbone diagrams. Optionally filter by project. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_fishbone",
        description: "Get a single fishbone diagram by its ID.",
      },
      getByName: {
        name: "get_fishbone_by_name",
        description:
          "Get a fishbone diagram by its title (case-insensitive). Prefer this over list_fishbones when the title is known.",
      },
      create: {
        name: "create_fishbone",
        description: "Create a new fishbone (Ishikawa) diagram.",
      },
      update: {
        name: "update_fishbone",
        description: "Update an existing fishbone diagram's fields.",
      },
      delete: {
        name: "delete_fishbone",
        description: "Delete a fishbone diagram by its ID.",
      },
    },
  });
}

export const fishboneModule = defineMcpModule({
  feature: "fishbone",
  register: registerFishboneTools,
});

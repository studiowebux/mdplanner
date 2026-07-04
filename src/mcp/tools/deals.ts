// MCP tools for deal operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getDealService } from "../../singletons/services.ts";
import {
  CreateDealSchema,
  DealSchema,
  ListDealOptionsSchema,
  UpdateDealSchema,
} from "../../types/deal.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerDealTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getDealService(),
    notFoundLabel: "Deal",
    idParam: DealSchema.shape.id.describe("Deal ID"),
    nameParam: DealSchema.shape.title.describe("Deal title"),
    listSchema: ListDealOptionsSchema,
    createSchema: CreateDealSchema,
    updateSchema: UpdateDealSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "stage", "value", "company"],
    tools: {
      list: {
        name: "list_deals",
        description:
          "List all deals. Optionally filter by stage, company, or project. Pass slim: true to browse with a compact projection.",
      },
      get: { name: "get_deal", description: "Get a single deal by its ID." },
      getByName: {
        name: "get_deal_by_name",
        description:
          "Get a deal by its title (case-insensitive). Prefer this over list_deals when the title is known.",
      },
      create: { name: "create_deal", description: "Create a new deal." },
      update: {
        name: "update_deal",
        description: "Update an existing deal's fields.",
      },
      delete: { name: "delete_deal", description: "Delete a deal by its ID." },
    },
  });
}

export const dealModule = defineMcpModule({
  feature: "deal",
  register: registerDealTools,
});

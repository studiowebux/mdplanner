// Marketing Plan MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getMarketingPlanService } from "../../singletons/services.ts";
import {
  CreateMarketingPlanSchema,
  ListMarketingPlanOptionsSchema,
  MarketingPlanSchema,
  UpdateMarketingPlanSchema,
} from "../../types/marketing-plan.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerMarketingPlanTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getMarketingPlanService(),
    notFoundLabel: "Marketing plan",
    idParam: MarketingPlanSchema.shape.id.describe("Marketing Plan ID"),
    nameParam: MarketingPlanSchema.shape.name.describe("Marketing Plan name"),
    listSchema: ListMarketingPlanOptionsSchema,
    createSchema: CreateMarketingPlanSchema,
    updateSchema: UpdateMarketingPlanSchema,
    mutationReturn: "id-success",
    slimFields: ["name", "status", "project", "startDate", "endDate"],
    tools: {
      list: {
        name: "list_marketing_plans",
        description:
          "List all marketing plans. Optionally filter by status or search query.",
      },
      get: {
        name: "get_marketing_plan",
        description: "Get a single marketing plan by its ID.",
      },
      getByName: {
        name: "get_marketing_plan_by_name",
        description:
          "Get a marketing plan by its name (case-insensitive). Prefer this over list when the name is known.",
      },
      create: {
        name: "create_marketing_plan",
        description:
          "Create a new marketing plan. Status defaults to 'draft' if not specified.",
      },
      update: {
        name: "update_marketing_plan",
        description: "Update an existing marketing plan's fields.",
      },
      delete: {
        name: "delete_marketing_plan",
        description: "Delete a marketing plan by its ID.",
      },
    },
  });
}

export const marketingPlanModule = defineMcpModule({
  feature: "marketing_plan",
  register: registerMarketingPlanTools,
});

// Marketing Plan MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarketingPlanService } from "../../singletons/services.ts";
import {
  CreateMarketingPlanSchema,
  ListMarketingPlanOptionsSchema,
  MarketingPlanSchema,
  UpdateMarketingPlanSchema,
} from "../../types/marketing-plan.types.ts";
import { err, ok } from "../utils.ts";

export function registerMarketingPlanTools(server: McpServer): void {
  const service = getMarketingPlanService();

  server.registerTool("list_marketing_plans", {
    description:
      "List all marketing plans. Optionally filter by status or search query.",
    inputSchema: ListMarketingPlanOptionsSchema.shape,
  }, async ({ status, q }) => {
    const plans = await service.list({ status, q });
    return ok(plans);
  });

  server.registerTool("get_marketing_plan", {
    description: "Get a single marketing plan by its ID.",
    inputSchema: {
      id: MarketingPlanSchema.shape.id.describe("Marketing Plan ID"),
    },
  }, async ({ id }) => {
    const plan = await service.getById(id);
    if (!plan) return err(`Marketing plan '${id}' not found`);
    return ok(plan);
  });

  server.registerTool("get_marketing_plan_by_name", {
    description:
      "Get a marketing plan by its name (case-insensitive). Prefer this over list when the name is known.",
    inputSchema: {
      name: MarketingPlanSchema.shape.name.describe("Marketing Plan name"),
    },
  }, async ({ name }) => {
    const plan = await service.getByName(name);
    if (!plan) return err(`Marketing plan '${name}' not found`);
    return ok(plan);
  });

  server.registerTool("create_marketing_plan", {
    description:
      "Create a new marketing plan. Status defaults to 'draft' if not specified.",
    inputSchema: CreateMarketingPlanSchema.shape,
  }, async (data) => {
    const plan = await service.create(data);
    return ok({ id: plan.id });
  });

  server.registerTool("update_marketing_plan", {
    description: "Update an existing marketing plan's fields.",
    inputSchema: {
      id: MarketingPlanSchema.shape.id.describe("Marketing Plan ID"),
      ...UpdateMarketingPlanSchema.shape,
    },
  }, async ({ id, ...fields }) => {
    const plan = await service.update(id, fields);
    if (!plan) return err(`Marketing plan '${id}' not found`);
    return ok({ success: true });
  });

  server.registerTool("delete_marketing_plan", {
    description: "Delete a marketing plan by its ID.",
    inputSchema: {
      id: MarketingPlanSchema.shape.id.describe("Marketing Plan ID"),
    },
  }, async ({ id }) => {
    const success = await service.delete(id);
    if (!success) return err(`Marketing plan '${id}' not found`);
    return ok({ success: true });
  });
}

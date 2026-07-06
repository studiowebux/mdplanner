// MCP tools for billing rate operations — thin wrappers over BillingRateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getBillingRateService } from "../../singletons/services.ts";
import {
  BillingRateSchema,
  CreateBillingRateSchema,
  ListBillingRateOptionsSchema,
  UpdateBillingRateSchema,
} from "../../types/billing-rate.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerBillingRateTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getBillingRateService(),
    notFoundLabel: "Billing rate",
    idParam: BillingRateSchema.shape.id.describe("Billing rate ID"),
    nameParam: BillingRateSchema.shape.name.describe("Billing rate name"),
    listSchema: ListBillingRateOptionsSchema,
    createSchema: CreateBillingRateSchema,
    updateSchema: UpdateBillingRateSchema,
    mutationReturn: "id-success",
    slimFields: ["name", "rate", "currency", "unit"],
    tools: {
      list: {
        name: "list_billing_rates",
        description:
          "List all billing rates. Optionally filter by search query.",
      },
      get: {
        name: "get_billing_rate",
        description: "Get a single billing rate by its ID.",
      },
      getByName: {
        name: "get_billing_rate_by_name",
        description:
          "Get a billing rate by its name (case-insensitive). Prefer this over list when the name is known.",
      },
      create: {
        name: "create_billing_rate",
        description: "Create a new billing rate card.",
      },
      update: {
        name: "update_billing_rate",
        description: "Update an existing billing rate's fields.",
      },
      delete: {
        name: "delete_billing_rate",
        description: "Delete a billing rate by its ID.",
      },
    },
  });
}

export const billingRateModule = defineMcpModule({
  feature: "rate",
  register: registerBillingRateTools,
});

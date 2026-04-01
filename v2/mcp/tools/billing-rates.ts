// MCP tools for billing rate operations — thin wrappers over BillingRateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBillingRateService } from "../../singletons/services.ts";
import {
  BillingRateSchema,
  CreateBillingRateSchema,
  ListBillingRateOptionsSchema,
  UpdateBillingRateSchema,
} from "../../types/billing-rate.types.ts";
import { err, ok } from "../utils.ts";

export function registerBillingRateTools(server: McpServer): void {
  const service = getBillingRateService();

  server.registerTool(
    "list_billing_rates",
    {
      description: "List all billing rates. Optionally filter by search query.",
      inputSchema: ListBillingRateOptionsSchema.shape,
    },
    async ({ q }) => {
      const rates = await service.list({ q });
      return ok(rates);
    },
  );

  server.registerTool(
    "get_billing_rate",
    {
      description: "Get a single billing rate by its ID.",
      inputSchema: {
        id: BillingRateSchema.shape.id.describe("Billing rate ID"),
      },
    },
    async ({ id }) => {
      const rate = await service.getById(id);
      if (!rate) return err(`Billing rate '${id}' not found`);
      return ok(rate);
    },
  );

  server.registerTool(
    "get_billing_rate_by_name",
    {
      description:
        "Get a billing rate by its name (case-insensitive). Prefer this over list when the name is known.",
      inputSchema: {
        name: BillingRateSchema.shape.name.describe("Billing rate name"),
      },
    },
    async ({ name }) => {
      const rate = await service.getByName(name);
      if (!rate) return err(`Billing rate '${name}' not found`);
      return ok(rate);
    },
  );

  server.registerTool(
    "create_billing_rate",
    {
      description: "Create a new billing rate card.",
      inputSchema: CreateBillingRateSchema.shape,
    },
    async (data) => {
      const rate = await service.create(data);
      return ok({ id: rate.id });
    },
  );

  server.registerTool(
    "update_billing_rate",
    {
      description: "Update an existing billing rate's fields.",
      inputSchema: {
        id: BillingRateSchema.shape.id.describe("Billing rate ID"),
        ...UpdateBillingRateSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const rate = await service.update(id, fields);
      if (!rate) return err(`Billing rate '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_billing_rate",
    {
      description: "Delete a billing rate by its ID.",
      inputSchema: {
        id: BillingRateSchema.shape.id.describe("Billing rate ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Billing rate '${id}' not found`);
      return ok({ success: true });
    },
  );
}

// MCP tools for customer operations — thin wrappers over CustomerService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCustomerService } from "../../singletons/services.ts";
import {
  CreateCustomerSchema,
  CustomerSchema,
  ListCustomerOptionsSchema,
  UpdateCustomerSchema,
} from "../../types/customer.types.ts";
import { err, ok } from "../utils.ts";

export function registerCustomerTools(server: McpServer): void {
  const service = getCustomerService();

  server.registerTool(
    "list_customers",
    {
      description: "List all customers. Optionally filter by search query.",
      inputSchema: ListCustomerOptionsSchema.shape,
    },
    async ({ q }) => {
      const customers = await service.list({ q });
      return ok(customers);
    },
  );

  server.registerTool(
    "get_customer",
    {
      description: "Get a single customer by its ID.",
      inputSchema: { id: CustomerSchema.shape.id.describe("Customer ID") },
    },
    async ({ id }) => {
      const customer = await service.getById(id);
      if (!customer) return err(`Customer '${id}' not found`);
      return ok(customer);
    },
  );

  server.registerTool(
    "get_customer_by_name",
    {
      description:
        "Get a customer by name (case-insensitive). Prefer this over list_customers when the name is known.",
      inputSchema: {
        name: CustomerSchema.shape.name.describe("Customer name"),
      },
    },
    async ({ name }) => {
      const customer = await service.getByName(name);
      if (!customer) return err(`Customer '${name}' not found`);
      return ok(customer);
    },
  );

  server.registerTool(
    "create_customer",
    {
      description: "Create a new customer.",
      inputSchema: CreateCustomerSchema.shape,
    },
    async (data) => {
      const customer = await service.create(data);
      return ok({ id: customer.id });
    },
  );

  server.registerTool(
    "update_customer",
    {
      description: "Update an existing customer's fields.",
      inputSchema: {
        id: CustomerSchema.shape.id.describe("Customer ID"),
        ...UpdateCustomerSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const customer = await service.update(id, fields);
      if (!customer) return err(`Customer '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_customer",
    {
      description: "Delete a customer by its ID.",
      inputSchema: { id: CustomerSchema.shape.id.describe("Customer ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Customer '${id}' not found`);
      return ok({ success: true });
    },
  );
}

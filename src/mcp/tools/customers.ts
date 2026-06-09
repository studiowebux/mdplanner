// MCP tools for customer operations — thin wrappers over CustomerService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCustomerService } from "../../singletons/services.ts";
import {
  CreateCustomerSchema,
  CustomerSchema,
  ListCustomerOptionsSchema,
  UpdateCustomerSchema,
} from "../../types/customer.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerCustomerTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getCustomerService(),
    notFoundLabel: "Customer",
    idParam: CustomerSchema.shape.id.describe("Customer ID"),
    nameParam: CustomerSchema.shape.name.describe("Customer name"),
    listSchema: ListCustomerOptionsSchema,
    createSchema: CreateCustomerSchema,
    updateSchema: UpdateCustomerSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_customers",
        description: "List all customers. Optionally filter by search query.",
      },
      get: {
        name: "get_customer",
        description: "Get a single customer by its ID.",
      },
      getByName: {
        name: "get_customer_by_name",
        description:
          "Get a customer by name (case-insensitive). Prefer this over list_customers when the name is known.",
      },
      create: {
        name: "create_customer",
        description: "Create a new customer.",
      },
      update: {
        name: "update_customer",
        description: "Update an existing customer's fields.",
      },
      delete: {
        name: "delete_customer",
        description: "Delete a customer by its ID.",
      },
    },
  });
}

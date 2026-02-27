/**
 * MCP tools for billing operations (customers, quotes, invoices).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerBillingTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  // --- Customers ---

  server.registerTool(
    "list_customers",
    { description: "List all billing customers.", inputSchema: {} },
    async () => ok(await parser.readCustomers()),
  );

  server.registerTool(
    "get_customer",
    {
      description: "Get a single billing customer by their ID.",
      inputSchema: { id: z.string().describe("Customer ID") },
    },
    async ({ id }) => {
      const items = await parser.readCustomers();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Customer '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_customer",
    {
      description: "Create a new billing customer.",
      inputSchema: {
        name: z.string().describe("Customer name"),
        email: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ name, email, company, address, notes }) => {
      const item = await parser.addCustomer({
        name,
        ...(email && { email }),
        ...(company && { company }),
        ...(address && { address }),
        notes: notes ?? "",
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_customer",
    {
      description: "Update a billing customer's fields.",
      inputSchema: {
        id: z.string().describe("Customer ID"),
        name: z.string().optional(),
        email: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const success = await parser.updateCustomer(id, updates);
      if (!success) return err(`Customer '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_customer",
    {
      description: "Delete a billing customer by their ID.",
      inputSchema: { id: z.string().describe("Customer ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteCustomer(id);
      if (!success) return err(`Customer '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Quotes ---

  server.registerTool(
    "list_quotes",
    { description: "List all quotes.", inputSchema: {} },
    async () => ok(await parser.readQuotes()),
  );

  server.registerTool(
    "get_quote",
    {
      description: "Get a single quote by its ID.",
      inputSchema: { id: z.string().describe("Quote ID") },
    },
    async ({ id }) => {
      const items = await parser.readQuotes();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Quote '${id}' not found`);
      return ok(item);
    },
  );

  // --- Invoices ---

  server.registerTool(
    "list_invoices",
    { description: "List all invoices.", inputSchema: {} },
    async () => ok(await parser.readInvoices()),
  );

  server.registerTool(
    "get_invoice",
    {
      description: "Get a single invoice by its ID.",
      inputSchema: { id: z.string().describe("Invoice ID") },
    },
    async ({ id }) => {
      const items = await parser.readInvoices();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Invoice '${id}' not found`);
      return ok(item);
    },
  );
}

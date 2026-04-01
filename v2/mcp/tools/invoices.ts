// MCP tools for invoice operations — thin wrappers over InvoiceService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInvoiceService } from "../../singletons/services.ts";
import {
  CreateInvoiceSchema,
  InvoiceSchema,
  ListInvoiceOptionsSchema,
  UpdateInvoiceSchema,
} from "../../types/invoice.types.ts";
import { err, ok } from "../utils.ts";

export function registerInvoiceTools(server: McpServer): void {
  const service = getInvoiceService();

  server.registerTool(
    "list_invoices",
    {
      description:
        "List all invoices. Optionally filter by status, customerId, or search query.",
      inputSchema: ListInvoiceOptionsSchema.shape,
    },
    async ({ status, customerId, q }) => {
      const invoices = await service.list({ status, customerId, q });
      return ok(invoices);
    },
  );

  server.registerTool(
    "get_invoice",
    {
      description: "Get a single invoice by its ID.",
      inputSchema: { id: InvoiceSchema.shape.id.describe("Invoice ID") },
    },
    async ({ id }) => {
      const invoice = await service.getById(id);
      if (!invoice) return err(`Invoice '${id}' not found`);
      return ok(invoice);
    },
  );

  server.registerTool(
    "get_invoice_by_name",
    {
      description:
        "Get an invoice by its title (case-insensitive). Prefer this over list when the title is known.",
      inputSchema: {
        name: InvoiceSchema.shape.title.describe("Invoice title"),
      },
    },
    async ({ name }) => {
      const invoice = await service.getByName(name);
      if (!invoice) return err(`Invoice '${name}' not found`);
      return ok(invoice);
    },
  );

  server.registerTool(
    "create_invoice",
    {
      description:
        "Create a new invoice. Number auto-generated if not specified. Status defaults to 'draft'.",
      inputSchema: CreateInvoiceSchema.shape,
    },
    async (data) => {
      const invoice = await service.create(data);
      return ok({ id: invoice.id });
    },
  );

  server.registerTool(
    "update_invoice",
    {
      description: "Update an existing invoice's fields.",
      inputSchema: {
        id: InvoiceSchema.shape.id.describe("Invoice ID"),
        ...UpdateInvoiceSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const invoice = await service.update(id, fields);
      if (!invoice) return err(`Invoice '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_invoice",
    {
      description: "Delete an invoice by its ID.",
      inputSchema: { id: InvoiceSchema.shape.id.describe("Invoice ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Invoice '${id}' not found`);
      return ok({ success: true });
    },
  );
}

// MCP tools for invoice operations — thin wrappers over InvoiceService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInvoiceService } from "../../singletons/services.ts";
import {
  CreateInvoiceSchema,
  InvoiceSchema,
  ListInvoiceOptionsSchema,
  UpdateInvoiceSchema,
} from "../../types/invoice.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerInvoiceTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getInvoiceService(),
    notFoundLabel: "Invoice",
    idParam: InvoiceSchema.shape.id.describe("Invoice ID"),
    nameParam: InvoiceSchema.shape.title.describe("Invoice title"),
    listSchema: ListInvoiceOptionsSchema,
    createSchema: CreateInvoiceSchema,
    updateSchema: UpdateInvoiceSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "status", "currency", "dueDate", "customerId"],
    tools: {
      list: {
        name: "list_invoices",
        description:
          "List all invoices. Optionally filter by status, customerId, or search query.",
      },
      get: {
        name: "get_invoice",
        description: "Get a single invoice by its ID.",
      },
      getByName: {
        name: "get_invoice_by_name",
        description:
          "Get an invoice by its title (case-insensitive). Prefer this over list when the title is known.",
      },
      create: {
        name: "create_invoice",
        description:
          "Create a new invoice. Number auto-generated if not specified. Status defaults to 'draft'.",
      },
      update: {
        name: "update_invoice",
        description: "Update an existing invoice's fields.",
      },
      delete: {
        name: "delete_invoice",
        description: "Delete an invoice by its ID.",
      },
    },
  });
}

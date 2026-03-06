/**
 * MCP tools for billing operations (customers, quotes, invoices).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional().default(1),
  rate: z.number().optional().default(0),
  amount: z.number().describe("Line total amount"),
});

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

  server.registerTool(
    "create_quote",
    {
      description: "Create a new quote.",
      inputSchema: {
        customer_id: z.string().describe("Customer ID"),
        title: z.string().optional().default("Untitled Quote").describe(
          "Quote title",
        ),
        status: z.string().optional().describe(
          "Status (draft, sent, accepted, rejected — default: draft)",
        ),
        valid_until: z.string().optional().describe(
          "Expiry date (YYYY-MM-DD)",
        ),
        line_items: z.array(LineItemSchema).optional().describe(
          "Line items. Each must have at minimum 'description' and 'amount'.",
        ),
        tax_rate: z.number().optional().describe(
          "Tax rate as a percentage (e.g. 15 for 15%)",
        ),
        notes: z.string().optional(),
      },
    },
    async (
      { customer_id, title, status, valid_until, line_items, tax_rate, notes },
    ) => {
      const quotes = await parser.readQuotes();
      const id = crypto.randomUUID().substring(0, 8);
      const number = await parser.getNextQuoteNumber();
      const lineItems = (line_items ?? []).map((li, i) => ({
        id: crypto.randomUUID().substring(0, 8) + i,
        description: li.description,
        quantity: li.quantity ?? 1,
        rate: li.rate ?? 0,
        amount: li.amount,
      }));
      const subtotal = lineItems.reduce(
        (sum, item) => sum + (item.amount || 0),
        0,
      );
      const tax = tax_rate ? subtotal * (tax_rate / 100) : 0;
      const newQuote = {
        id,
        number,
        customerId: customer_id,
        title: title ?? "Untitled Quote",
        status: (status ?? "draft") as
          | "draft"
          | "sent"
          | "accepted"
          | "rejected",
        ...(valid_until && { validUntil: valid_until }),
        lineItems,
        subtotal,
        tax,
        ...(tax_rate !== undefined && { taxRate: tax_rate }),
        total: subtotal + tax,
        ...(notes && { notes }),
        created: new Date().toISOString().split("T")[0],
      };
      quotes.push(newQuote);
      await parser.saveQuotes(quotes);
      return ok({ id, number });
    },
  );

  server.registerTool(
    "update_quote",
    {
      description: "Update an existing quote's fields.",
      inputSchema: {
        id: z.string().describe("Quote ID"),
        title: z.string().optional(),
        status: z.string().optional(),
        valid_until: z.string().optional(),
        line_items: z.array(LineItemSchema).optional().describe(
          "Full replacement list of line items",
        ),
        tax_rate: z.number().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, valid_until, line_items, tax_rate, ...rest }) => {
      const quotes = await parser.readQuotes();
      const index = quotes.findIndex((q) => q.id === id);
      if (index === -1) return err(`Quote '${id}' not found`);
      const mappedLineItems = line_items?.map((li, i) => ({
        id: crypto.randomUUID().substring(0, 8) + i,
        description: li.description,
        quantity: li.quantity ?? 1,
        rate: li.rate ?? 0,
        amount: li.amount,
      }));
      const updated = {
        ...quotes[index],
        ...rest,
        ...(valid_until !== undefined && { validUntil: valid_until }),
        ...(mappedLineItems !== undefined && { lineItems: mappedLineItems }),
        ...(tax_rate !== undefined && { taxRate: tax_rate }),
      };
      if (mappedLineItems !== undefined) {
        updated.subtotal = mappedLineItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0,
        );
        updated.tax = updated.taxRate
          ? updated.subtotal * (updated.taxRate / 100)
          : 0;
        updated.total = updated.subtotal + (updated.tax || 0);
      }
      quotes[index] = updated as typeof quotes[number];
      await parser.saveQuotes(quotes);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_quote",
    {
      description: "Delete a quote by its ID.",
      inputSchema: { id: z.string().describe("Quote ID") },
    },
    async ({ id }) => {
      const quotes = await parser.readQuotes();
      const filtered = quotes.filter((q) => q.id !== id);
      if (filtered.length === quotes.length) {
        return err(`Quote '${id}' not found`);
      }
      await parser.saveQuotes(filtered);
      return ok({ success: true });
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

  server.registerTool(
    "create_invoice",
    {
      description: "Create a new invoice.",
      inputSchema: {
        customer_id: z.string().describe("Customer ID"),
        title: z.string().optional().default("Untitled Invoice").describe(
          "Invoice title",
        ),
        quote_id: z.string().optional().describe(
          "Quote ID if this invoice is derived from a quote",
        ),
        status: z.string().optional().describe(
          "Status (draft, sent, paid, overdue — default: draft)",
        ),
        due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
        line_items: z.array(LineItemSchema).optional(),
        tax_rate: z.number().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        customer_id,
        title,
        quote_id,
        status,
        due_date,
        line_items,
        tax_rate,
        notes,
      },
    ) => {
      const invoices = await parser.readInvoices();
      const id = crypto.randomUUID().substring(0, 8);
      const number = await parser.getNextInvoiceNumber();
      const lineItems = (line_items ?? []).map((li, i) => ({
        id: crypto.randomUUID().substring(0, 8) + i,
        description: li.description,
        quantity: li.quantity ?? 1,
        rate: li.rate ?? 0,
        amount: li.amount,
      }));
      const subtotal = lineItems.reduce(
        (sum, item) => sum + (item.amount || 0),
        0,
      );
      const tax = tax_rate ? subtotal * (tax_rate / 100) : 0;
      const newInvoice = {
        id,
        number,
        customerId: customer_id,
        title: title ?? "Untitled Invoice",
        ...(quote_id && { quoteId: quote_id }),
        status: (status ?? "draft") as
          | "draft"
          | "sent"
          | "paid"
          | "overdue"
          | "cancelled",
        ...(due_date && { dueDate: due_date }),
        lineItems,
        subtotal,
        tax,
        ...(tax_rate !== undefined && { taxRate: tax_rate }),
        total: subtotal + tax,
        paidAmount: 0,
        ...(notes && { notes }),
        created: new Date().toISOString().split("T")[0],
      };
      invoices.push(newInvoice);
      await parser.saveInvoices(invoices);
      return ok({ id, number });
    },
  );

  server.registerTool(
    "update_invoice",
    {
      description: "Update an existing invoice's fields.",
      inputSchema: {
        id: z.string().describe("Invoice ID"),
        title: z.string().optional(),
        status: z.string().optional(),
        due_date: z.string().optional(),
        line_items: z.array(LineItemSchema).optional().describe(
          "Full replacement list of line items",
        ),
        tax_rate: z.number().optional(),
        paid_amount: z.number().optional().describe("Amount paid so far"),
        notes: z.string().optional(),
      },
    },
    async ({ id, due_date, line_items, tax_rate, paid_amount, ...rest }) => {
      const invoices = await parser.readInvoices();
      const index = invoices.findIndex((inv) => inv.id === id);
      if (index === -1) return err(`Invoice '${id}' not found`);
      const mappedInvItems = line_items?.map((li, i) => ({
        id: crypto.randomUUID().substring(0, 8) + i,
        description: li.description,
        quantity: li.quantity ?? 1,
        rate: li.rate ?? 0,
        amount: li.amount,
      }));
      const updated = {
        ...invoices[index],
        ...rest,
        ...(due_date !== undefined && { dueDate: due_date }),
        ...(mappedInvItems !== undefined && { lineItems: mappedInvItems }),
        ...(tax_rate !== undefined && { taxRate: tax_rate }),
        ...(paid_amount !== undefined && { paidAmount: paid_amount }),
      };
      if (mappedInvItems !== undefined) {
        updated.subtotal = mappedInvItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0,
        );
        updated.tax = updated.taxRate
          ? updated.subtotal * (updated.taxRate / 100)
          : 0;
        updated.total = updated.subtotal + (updated.tax || 0);
      }
      invoices[index] = updated as typeof invoices[number];
      await parser.saveInvoices(invoices);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_invoice",
    {
      description: "Delete an invoice by its ID.",
      inputSchema: { id: z.string().describe("Invoice ID") },
    },
    async ({ id }) => {
      const invoices = await parser.readInvoices();
      const filtered = invoices.filter((inv) => inv.id !== id);
      if (filtered.length === invoices.length) {
        return err(`Invoice '${id}' not found`);
      }
      await parser.saveInvoices(filtered);
      return ok({ success: true });
    },
  );
}

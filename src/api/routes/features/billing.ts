/**
 * Billing routes (customers, rates, quotes, invoices, payments).
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";
import { Task } from "../../../lib/types.ts";
import { eventBus } from "../../../lib/event-bus.ts";

export const billingRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

function findTaskById(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.children) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ================== CUSTOMERS ==================

const listCustomersRoute = createRoute({
  method: "get",
  path: "/customers",
  tags: ["Customers"],
  summary: "List all customers",
  operationId: "listCustomers",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of customers",
    },
  },
});

const getCustomerRoute = createRoute({
  method: "get",
  path: "/customers/{id}",
  tags: ["Customers"],
  summary: "Get single customer",
  operationId: "getCustomer",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Customer details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createCustomerRoute = createRoute({
  method: "post",
  path: "/customers",
  tags: ["Customers"],
  summary: "Create customer",
  operationId: "createCustomer",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Customer created",
    },
  },
});

const updateCustomerRoute = createRoute({
  method: "put",
  path: "/customers/{id}",
  tags: ["Customers"],
  summary: "Update customer",
  operationId: "updateCustomer",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated customer",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteCustomerRoute = createRoute({
  method: "delete",
  path: "/customers/{id}",
  tags: ["Customers"],
  summary: "Delete customer",
  operationId: "deleteCustomer",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Customer deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ================== BILLING RATES ==================

const listBillingRatesRoute = createRoute({
  method: "get",
  path: "/billing-rates",
  tags: ["Billing Rates"],
  summary: "List all billing rates",
  operationId: "listBillingRates",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of billing rates",
    },
  },
});

const createBillingRateRoute = createRoute({
  method: "post",
  path: "/billing-rates",
  tags: ["Billing Rates"],
  summary: "Create billing rate",
  operationId: "createBillingRate",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Billing rate created",
    },
  },
});

const updateBillingRateRoute = createRoute({
  method: "put",
  path: "/billing-rates/{id}",
  tags: ["Billing Rates"],
  summary: "Update billing rate",
  operationId: "updateBillingRate",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated billing rate",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteBillingRateRoute = createRoute({
  method: "delete",
  path: "/billing-rates/{id}",
  tags: ["Billing Rates"],
  summary: "Delete billing rate",
  operationId: "deleteBillingRate",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Billing rate deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ================== QUOTES ==================

const listQuotesRoute = createRoute({
  method: "get",
  path: "/quotes",
  tags: ["Quotes"],
  summary: "List all quotes",
  operationId: "listQuotes",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of quotes",
    },
  },
});

const getQuoteRoute = createRoute({
  method: "get",
  path: "/quotes/{id}",
  tags: ["Quotes"],
  summary: "Get single quote",
  operationId: "getQuote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Quote details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createQuoteRoute = createRoute({
  method: "post",
  path: "/quotes",
  tags: ["Quotes"],
  summary: "Create quote",
  operationId: "createQuote",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Quote created",
    },
  },
});

const updateQuoteRoute = createRoute({
  method: "put",
  path: "/quotes/{id}",
  tags: ["Quotes"],
  summary: "Update quote",
  operationId: "updateQuote",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated quote",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteQuoteRoute = createRoute({
  method: "delete",
  path: "/quotes/{id}",
  tags: ["Quotes"],
  summary: "Delete quote",
  operationId: "deleteQuote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Quote deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const sendQuoteRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/send",
  tags: ["Quotes"],
  summary: "Mark quote as sent",
  operationId: "sendQuote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Quote marked as sent",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const acceptQuoteRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/accept",
  tags: ["Quotes"],
  summary: "Mark quote as accepted",
  operationId: "acceptQuote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Quote marked as accepted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const quoteToInvoiceRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/to-invoice",
  tags: ["Quotes"],
  summary: "Convert quote to invoice",
  operationId: "convertQuoteToInvoice",
  request: { params: idParam },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Invoice created from quote",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Quote not found",
    },
  },
});

// ================== INVOICES ==================

const listInvoicesRoute = createRoute({
  method: "get",
  path: "/invoices",
  tags: ["Invoices"],
  summary: "List all invoices",
  operationId: "listInvoices",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of invoices",
    },
  },
});

const getInvoiceRoute = createRoute({
  method: "get",
  path: "/invoices/{id}",
  tags: ["Invoices"],
  summary: "Get single invoice",
  operationId: "getInvoice",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Invoice details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createInvoiceRoute = createRoute({
  method: "post",
  path: "/invoices",
  tags: ["Invoices"],
  summary: "Create invoice",
  operationId: "createInvoice",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Invoice created",
    },
  },
});

const updateInvoiceRoute = createRoute({
  method: "put",
  path: "/invoices/{id}",
  tags: ["Invoices"],
  summary: "Update invoice",
  operationId: "updateInvoice",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated invoice",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteInvoiceRoute = createRoute({
  method: "delete",
  path: "/invoices/{id}",
  tags: ["Invoices"],
  summary: "Delete invoice",
  operationId: "deleteInvoice",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Invoice deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const sendInvoiceRoute = createRoute({
  method: "post",
  path: "/invoices/{id}/send",
  tags: ["Invoices"],
  summary: "Mark invoice as sent",
  operationId: "sendInvoice",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Invoice marked as sent",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const getInvoicePaymentsRoute = createRoute({
  method: "get",
  path: "/invoices/{id}/payments",
  tags: ["Invoices"],
  summary: "Get payments for an invoice",
  operationId: "getInvoicePayments",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Invoice payments",
    },
  },
});

const addInvoicePaymentRoute = createRoute({
  method: "post",
  path: "/invoices/{id}/payments",
  tags: ["Invoices"],
  summary: "Add payment to invoice",
  operationId: "addInvoicePayment",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Payment added",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invoice not found",
    },
  },
});

const generateInvoiceRoute = createRoute({
  method: "post",
  path: "/invoices/generate",
  tags: ["Invoices"],
  summary: "Generate invoice from time entries",
  operationId: "generateInvoiceFromTimeEntries",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Invoice generated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

// ================== SUMMARY ==================

const getBillingSummaryRoute = createRoute({
  method: "get",
  path: "/billing/summary",
  tags: ["Billing"],
  summary: "Get billing summary dashboard data",
  operationId: "getBillingSummary",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Billing summary",
    },
  },
});

// ================== HANDLERS ==================

billingRouter.openapi(listCustomersRoute, async (c) => {
  const parser = getParser(c);
  const customers = await parser.readCustomers();
  return c.json(customers, 200);
});

billingRouter.openapi(getCustomerRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const customers = await parser.readCustomers();
  const customer = customers.find((cust) => cust.id === id);
  if (!customer) return c.json({ error: "Not found" }, 404);
  return c.json(customer, 200);
});

billingRouter.openapi(createCustomerRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const customers = await parser.readCustomers();
  const id = crypto.randomUUID().substring(0, 8);
  const newCustomer = {
    id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    billingAddress: body.billingAddress,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  customers.push(newCustomer);
  await parser.saveCustomers(customers);
  await cacheWriteThrough(c, "customers");
  eventBus.emit({ entity: "billing", action: "created", id });
  return c.json(newCustomer, 201);
});

billingRouter.openapi(updateCustomerRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const customers = await parser.readCustomers();
  const index = customers.findIndex((cust) => cust.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  customers[index] = { ...customers[index], ...body };
  await parser.saveCustomers(customers);
  await cacheWriteThrough(c, "customers");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(customers[index], 200);
});

billingRouter.openapi(deleteCustomerRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const customers = await parser.readCustomers();
  const filtered = customers.filter((cust) => cust.id !== id);
  if (filtered.length === customers.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveCustomers(filtered);
  cachePurge(c, "customers", id);
  eventBus.emit({ entity: "billing", action: "deleted", id });
  return c.json({ success: true }, 200);
});

billingRouter.openapi(listBillingRatesRoute, async (c) => {
  const parser = getParser(c);
  const rates = await parser.readBillingRates();
  return c.json(rates, 200);
});

billingRouter.openapi(createBillingRateRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const rates = await parser.readBillingRates();
  const id = crypto.randomUUID().substring(0, 8);
  const newRate = {
    id,
    name: body.name,
    hourlyRate: body.hourlyRate || 0,
    assignee: body.assignee,
    isDefault: body.isDefault,
  };
  rates.push(newRate);
  await parser.saveBillingRates(rates);
  await cacheWriteThrough(c, "rates");
  eventBus.emit({ entity: "billing", action: "created", id });
  return c.json(newRate, 201);
});

billingRouter.openapi(updateBillingRateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const rates = await parser.readBillingRates();
  const index = rates.findIndex((r) => r.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  rates[index] = { ...rates[index], ...body };
  await parser.saveBillingRates(rates);
  await cacheWriteThrough(c, "rates");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(rates[index], 200);
});

billingRouter.openapi(deleteBillingRateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const rates = await parser.readBillingRates();
  const filtered = rates.filter((r) => r.id !== id);
  if (filtered.length === rates.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveBillingRates(filtered);
  cachePurge(c, "rates", id);
  eventBus.emit({ entity: "billing", action: "deleted", id });
  return c.json({ success: true }, 200);
});

billingRouter.openapi(listQuotesRoute, async (c) => {
  const parser = getParser(c);
  const quotes = await parser.readQuotes();
  return c.json(quotes, 200);
});

billingRouter.openapi(getQuoteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const quotes = await parser.readQuotes();
  const quote = quotes.find((q) => q.id === id);
  if (!quote) return c.json({ error: "Not found" }, 404);
  return c.json(quote, 200);
});

billingRouter.openapi(createQuoteRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const quotes = await parser.readQuotes();
  const id = crypto.randomUUID().substring(0, 8);
  const number = await parser.getNextQuoteNumber();
  const lineItems = body.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum: number, item: { amount: number }) => sum + (item.amount || 0),
    0,
  );
  const tax = body.taxRate ? subtotal * (body.taxRate / 100) : 0;
  const newQuote = {
    id,
    number,
    customerId: body.customerId,
    title: body.title,
    status: body.status || "draft",
    validUntil: body.validUntil,
    lineItems,
    subtotal,
    tax,
    taxRate: body.taxRate,
    total: subtotal + tax,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  quotes.push(newQuote);
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  eventBus.emit({ entity: "billing", action: "created", id });
  return c.json(newQuote, 201);
});

billingRouter.openapi(updateQuoteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  const updated = { ...quotes[index], ...body };
  if (body.lineItems) {
    updated.subtotal = updated.lineItems.reduce(
      (sum: number, item: { amount: number }) => sum + (item.amount || 0),
      0,
    );
    updated.tax = updated.taxRate
      ? updated.subtotal * (updated.taxRate / 100)
      : 0;
    updated.total = updated.subtotal + (updated.tax || 0);
  }
  quotes[index] = updated;
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(quotes[index], 200);
});

billingRouter.openapi(deleteQuoteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const quotes = await parser.readQuotes();
  const filtered = quotes.filter((q) => q.id !== id);
  if (filtered.length === quotes.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveQuotes(filtered);
  cachePurge(c, "quotes", id);
  eventBus.emit({ entity: "billing", action: "deleted", id });
  return c.json({ success: true }, 200);
});

billingRouter.openapi(sendQuoteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  quotes[index].status = "sent";
  quotes[index].sentAt = new Date().toISOString().split("T")[0];
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(quotes[index], 200);
});

billingRouter.openapi(acceptQuoteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  quotes[index].status = "accepted";
  quotes[index].acceptedAt = new Date().toISOString().split("T")[0];
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(quotes[index], 200);
});

billingRouter.openapi(quoteToInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const quotes = await parser.readQuotes();
  const quote = quotes.find((q) => q.id === id);
  if (!quote) return c.json({ error: "Quote not found" }, 404);
  const invoices = await parser.readInvoices();
  const invoiceId = crypto.randomUUID().substring(0, 8);
  const invoiceNumber = await parser.getNextInvoiceNumber();
  const newInvoice = {
    id: invoiceId,
    number: invoiceNumber,
    customerId: quote.customerId,
    quoteId: quote.id,
    title: quote.title,
    status: "draft" as const,
    lineItems: quote.lineItems.map((item) => ({
      ...item,
      id: crypto.randomUUID().substring(0, 8),
    })),
    subtotal: quote.subtotal,
    tax: quote.tax,
    taxRate: quote.taxRate,
    total: quote.total,
    paidAmount: 0,
    notes: quote.notes,
    created: new Date().toISOString().split("T")[0],
  };
  invoices.push(newInvoice);
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "created", id: invoiceId });
  return c.json(newInvoice, 201);
});

billingRouter.openapi(listInvoicesRoute, async (c) => {
  const parser = getParser(c);
  const invoices = await parser.readInvoices();
  return c.json(invoices, 200);
});

billingRouter.openapi(getInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const invoices = await parser.readInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) return c.json({ error: "Not found" }, 404);
  return c.json(invoice, 200);
});

billingRouter.openapi(createInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const invoices = await parser.readInvoices();
  const id = crypto.randomUUID().substring(0, 8);
  const number = await parser.getNextInvoiceNumber();
  const lineItems = body.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum: number, item: { amount: number }) => sum + (item.amount || 0),
    0,
  );
  const tax = body.taxRate ? subtotal * (body.taxRate / 100) : 0;
  const newInvoice = {
    id,
    number,
    customerId: body.customerId,
    quoteId: body.quoteId,
    title: body.title,
    status: body.status || "draft",
    dueDate: body.dueDate,
    lineItems,
    subtotal,
    tax,
    taxRate: body.taxRate,
    total: subtotal + tax,
    paidAmount: 0,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  invoices.push(newInvoice);
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "created", id });
  return c.json(newInvoice, 201);
});

billingRouter.openapi(updateInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const invoices = await parser.readInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  const updated = { ...invoices[index], ...body };
  if (body.lineItems) {
    updated.subtotal = updated.lineItems.reduce(
      (sum: number, item: { amount: number }) => sum + (item.amount || 0),
      0,
    );
    updated.tax = updated.taxRate
      ? updated.subtotal * (updated.taxRate / 100)
      : 0;
    updated.total = updated.subtotal + (updated.tax || 0);
  }
  invoices[index] = updated;
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(invoices[index], 200);
});

billingRouter.openapi(deleteInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const invoices = await parser.readInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id);
  if (filtered.length === invoices.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveInvoices(filtered);
  cachePurge(c, "invoices", id);
  eventBus.emit({ entity: "billing", action: "deleted", id });
  return c.json({ success: true }, 200);
});

billingRouter.openapi(sendInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const invoices = await parser.readInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  invoices[index].status = "sent";
  invoices[index].sentAt = new Date().toISOString().split("T")[0];
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "updated", id });
  return c.json(invoices[index], 200);
});

billingRouter.openapi(getInvoicePaymentsRoute, async (c) => {
  const parser = getParser(c);
  const { id: invoiceId } = c.req.valid("param");
  const payments = await parser.readPayments();
  const invoicePayments = payments.filter((p) => p.invoiceId === invoiceId);
  return c.json(invoicePayments, 200);
});

billingRouter.openapi(addInvoicePaymentRoute, async (c) => {
  const parser = getParser(c);
  const { id: invoiceId } = c.req.valid("param");
  const body = c.req.valid("json");
  const invoices = await parser.readInvoices();
  const invoiceIndex = invoices.findIndex((inv) => inv.id === invoiceId);
  if (invoiceIndex === -1) {
    return c.json({ error: "Invoice not found" }, 404);
  }
  const payments = await parser.readPayments();
  const paymentId = crypto.randomUUID().substring(0, 8);
  const newPayment = {
    id: paymentId,
    invoiceId,
    amount: body.amount || 0,
    date: body.date || new Date().toISOString().split("T")[0],
    method: body.method,
    reference: body.reference,
    notes: body.notes,
  };
  payments.push(newPayment);
  await parser.savePayments(payments);
  await cacheWriteThrough(c, "payments");
  invoices[invoiceIndex].paidAmount += newPayment.amount;
  if (invoices[invoiceIndex].paidAmount >= invoices[invoiceIndex].total) {
    invoices[invoiceIndex].status = "paid";
    invoices[invoiceIndex].paidAt = new Date().toISOString().split("T")[0];
  }
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "created", id: paymentId });
  return c.json(newPayment, 201);
});

billingRouter.openapi(generateInvoiceRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const { customerId, taskIds, startDate, endDate, hourlyRate, title } = body;
  if (!customerId || !taskIds || !Array.isArray(taskIds)) {
    return c.json({ error: "customerId and taskIds are required" }, 400);
  }
  const timeEntries = await parser.readTimeEntries();
  const tasks = await parser.readTasks();
  const lineItems: {
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    taskId: string;
    timeEntryIds: string[];
  }[] = [];
  for (const taskId of taskIds) {
    const entries = timeEntries.get(taskId) || [];
    const task = findTaskById(tasks, taskId);
    const filteredEntries = entries.filter((entry) => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
    if (filteredEntries.length > 0) {
      const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
      const rate = hourlyRate || 0;
      lineItems.push({
        id: crypto.randomUUID().substring(0, 8),
        description: task?.title || `Task ${taskId}`,
        quantity: totalHours,
        rate,
        amount: totalHours * rate,
        taskId,
        timeEntryIds: filteredEntries.map((e) => e.id),
      });
    }
  }
  if (lineItems.length === 0) {
    return c.json(
      { error: "No time entries found for the specified criteria" },
      400,
    );
  }
  const invoices = await parser.readInvoices();
  const id = crypto.randomUUID().substring(0, 8);
  const number = await parser.getNextInvoiceNumber();
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const newInvoice = {
    id,
    number,
    customerId,
    title: title ||
      `Time Entry Invoice - ${new Date().toISOString().split("T")[0]}`,
    status: "draft" as const,
    lineItems,
    subtotal,
    tax: 0,
    total: subtotal,
    paidAmount: 0,
    created: new Date().toISOString().split("T")[0],
  };
  invoices.push(newInvoice);
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  eventBus.emit({ entity: "billing", action: "created", id });
  return c.json(newInvoice, 201);
});

billingRouter.openapi(getBillingSummaryRoute, async (c) => {
  const parser = getParser(c);
  const invoices = await parser.readInvoices();
  const quotes = await parser.readQuotes();
  const today = new Date().toISOString().split("T")[0];
  const summary = {
    totalOutstanding: 0,
    totalOverdue: 0,
    totalPaid: 0,
    totalInvoiced: 0,
    pendingQuotes: 0,
    acceptedQuotes: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  };
  for (const invoice of invoices) {
    summary.totalInvoiced += invoice.total;
    summary.totalPaid += invoice.paidAmount;
    if (invoice.status === "draft") {
      summary.draftInvoices++;
    } else if (invoice.status === "sent") {
      summary.sentInvoices++;
      summary.totalOutstanding += invoice.total - invoice.paidAmount;
      if (invoice.dueDate && invoice.dueDate < today) {
        summary.overdueInvoices++;
        summary.totalOverdue += invoice.total - invoice.paidAmount;
      }
    } else if (invoice.status === "paid") {
      summary.paidInvoices++;
    } else if (invoice.status === "overdue") {
      summary.overdueInvoices++;
      summary.totalOverdue += invoice.total - invoice.paidAmount;
      summary.totalOutstanding += invoice.total - invoice.paidAmount;
    }
  }
  for (const quote of quotes) {
    if (quote.status === "sent") {
      summary.pendingQuotes++;
    } else if (quote.status === "accepted") {
      summary.acceptedQuotes++;
    }
  }
  return c.json(summary, 200);
});

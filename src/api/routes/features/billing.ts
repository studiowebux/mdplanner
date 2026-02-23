/**
 * Billing routes (customers, rates, quotes, invoices, payments).
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";
import { Task } from "../../../lib/types.ts";

export const billingRouter = new Hono<{ Variables: AppVariables }>();

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

// GET /customers
billingRouter.get("/customers", async (c) => {
  const parser = getParser(c);
  const customers = await parser.readCustomers();
  return jsonResponse(customers);
});

// GET /customers/:id
billingRouter.get("/customers/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const customers = await parser.readCustomers();
  const customer = customers.find((cust) => cust.id === id);
  if (!customer) return errorResponse("Not found", 404);
  return jsonResponse(customer);
});

// POST /customers
billingRouter.post("/customers", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newCustomer, 201);
});

// PUT /customers/:id
billingRouter.put("/customers/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const customers = await parser.readCustomers();
  const index = customers.findIndex((cust) => cust.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  customers[index] = { ...customers[index], ...body };
  await parser.saveCustomers(customers);
  await cacheWriteThrough(c, "customers");
  return jsonResponse(customers[index]);
});

// DELETE /customers/:id
billingRouter.delete("/customers/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const customers = await parser.readCustomers();
  const filtered = customers.filter((cust) => cust.id !== id);
  if (filtered.length === customers.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveCustomers(filtered);
  cachePurge(c, "customers", id);
  return jsonResponse({ success: true });
});

// ================== BILLING RATES ==================

// GET /billing-rates
billingRouter.get("/billing-rates", async (c) => {
  const parser = getParser(c);
  const rates = await parser.readBillingRates();
  return jsonResponse(rates);
});

// POST /billing-rates
billingRouter.post("/billing-rates", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newRate, 201);
});

// PUT /billing-rates/:id
billingRouter.put("/billing-rates/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const rates = await parser.readBillingRates();
  const index = rates.findIndex((r) => r.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  rates[index] = { ...rates[index], ...body };
  await parser.saveBillingRates(rates);
  await cacheWriteThrough(c, "rates");
  return jsonResponse(rates[index]);
});

// DELETE /billing-rates/:id
billingRouter.delete("/billing-rates/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const rates = await parser.readBillingRates();
  const filtered = rates.filter((r) => r.id !== id);
  if (filtered.length === rates.length) return errorResponse("Not found", 404);
  await parser.saveBillingRates(filtered);
  cachePurge(c, "rates", id);
  return jsonResponse({ success: true });
});

// ================== QUOTES ==================

// GET /quotes
billingRouter.get("/quotes", async (c) => {
  const parser = getParser(c);
  const quotes = await parser.readQuotes();
  return jsonResponse(quotes);
});

// GET /quotes/:id
billingRouter.get("/quotes/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const quotes = await parser.readQuotes();
  const quote = quotes.find((q) => q.id === id);
  if (!quote) return errorResponse("Not found", 404);
  return jsonResponse(quote);
});

// POST /quotes
billingRouter.post("/quotes", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newQuote, 201);
});

// PUT /quotes/:id
billingRouter.put("/quotes/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return errorResponse("Not found", 404);

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
  return jsonResponse(quotes[index]);
});

// DELETE /quotes/:id
billingRouter.delete("/quotes/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const quotes = await parser.readQuotes();
  const filtered = quotes.filter((q) => q.id !== id);
  if (filtered.length === quotes.length) return errorResponse("Not found", 404);
  await parser.saveQuotes(filtered);
  cachePurge(c, "quotes", id);
  return jsonResponse({ success: true });
});

// POST /quotes/:id/send - mark as sent
billingRouter.post("/quotes/:id/send", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  quotes[index].status = "sent";
  quotes[index].sentAt = new Date().toISOString().split("T")[0];
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  return jsonResponse(quotes[index]);
});

// POST /quotes/:id/accept - mark as accepted
billingRouter.post("/quotes/:id/accept", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const quotes = await parser.readQuotes();
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  quotes[index].status = "accepted";
  quotes[index].acceptedAt = new Date().toISOString().split("T")[0];
  await parser.saveQuotes(quotes);
  await cacheWriteThrough(c, "quotes");
  return jsonResponse(quotes[index]);
});

// POST /quotes/:id/to-invoice - convert to invoice
billingRouter.post("/quotes/:id/to-invoice", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const quotes = await parser.readQuotes();
  const quote = quotes.find((q) => q.id === id);
  if (!quote) return errorResponse("Quote not found", 404);

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
  return jsonResponse(newInvoice, 201);
});

// ================== INVOICES ==================

// GET /invoices
billingRouter.get("/invoices", async (c) => {
  const parser = getParser(c);
  const invoices = await parser.readInvoices();
  return jsonResponse(invoices);
});

// GET /invoices/:id
billingRouter.get("/invoices/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const invoices = await parser.readInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) return errorResponse("Not found", 404);
  return jsonResponse(invoice);
});

// POST /invoices
billingRouter.post("/invoices", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newInvoice, 201);
});

// PUT /invoices/:id
billingRouter.put("/invoices/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const invoices = await parser.readInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  if (index === -1) return errorResponse("Not found", 404);

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
  return jsonResponse(invoices[index]);
});

// DELETE /invoices/:id
billingRouter.delete("/invoices/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const invoices = await parser.readInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id);
  if (filtered.length === invoices.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveInvoices(filtered);
  cachePurge(c, "invoices", id);
  return jsonResponse({ success: true });
});

// POST /invoices/:id/send - mark as sent
billingRouter.post("/invoices/:id/send", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const invoices = await parser.readInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  invoices[index].status = "sent";
  invoices[index].sentAt = new Date().toISOString().split("T")[0];
  await parser.saveInvoices(invoices);
  await cacheWriteThrough(c, "invoices");
  return jsonResponse(invoices[index]);
});

// GET /invoices/:id/payments - get payments for an invoice
billingRouter.get("/invoices/:id/payments", async (c) => {
  const parser = getParser(c);
  const invoiceId = c.req.param("id");
  const payments = await parser.readPayments();
  const invoicePayments = payments.filter((p) => p.invoiceId === invoiceId);
  return jsonResponse(invoicePayments);
});

// POST /invoices/:id/payments - add payment
billingRouter.post("/invoices/:id/payments", async (c) => {
  const parser = getParser(c);
  const invoiceId = c.req.param("id");
  const body = await c.req.json();

  const invoices = await parser.readInvoices();
  const invoiceIndex = invoices.findIndex((inv) => inv.id === invoiceId);
  if (invoiceIndex === -1) return errorResponse("Invoice not found", 404);

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

  return jsonResponse(newPayment, 201);
});

// POST /invoices/generate - generate from time entries
billingRouter.post("/invoices/generate", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const { customerId, taskIds, startDate, endDate, hourlyRate, title } = body;

  if (!customerId || !taskIds || !Array.isArray(taskIds)) {
    return errorResponse("customerId and taskIds are required", 400);
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
    return errorResponse(
      "No time entries found for the specified criteria",
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
  return jsonResponse(newInvoice, 201);
});

// GET /billing/summary - get billing summary
billingRouter.get("/billing/summary", async (c) => {
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

  return jsonResponse(summary);
});

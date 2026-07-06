/**
 * Invoice types — Zod schemas (single source), inferred types.
 * Bills sent to customers with enhanced line items and payment tracking.
 */

import { z } from "@hono/zod-openapi";
import { LineItemSchema } from "./billing.types.ts";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const InvoiceSchema = z.object({
  id: z.string().openapi({
    description: "Invoice ID",
    example: "invoice_startup1",
  }),
  number: z.string().openapi({
    description: "Invoice number (INV-YYYY-NNN)",
    example: "INV-2026-001",
  }),
  quoteId: z.string().openapi({
    description: "Source quote ID — invoices derive from a quote (required)",
    example: "quote_startup",
  }),
  projectId: z.string().nullable().optional().openapi({
    description: "Optional project this invoice bills against",
    example: "project_redesign",
  }),
  customerId: z.string().openapi({
    description: "Customer ID — derived from the referenced quote (read-only)",
    example: "customer_startup",
  }),
  title: z.string().openapi({
    description: "Invoice title",
    example: "Team Plan Annual - Year 1",
  }),
  status: z.enum(INVOICE_STATUSES).openapi({
    description: "Invoice status",
    example: "draft",
  }),
  currency: z.string().nullable().optional().openapi({
    description: "ISO 4217 currency code (defaults to project config)",
    example: "CAD",
  }),
  dueDate: z.string().nullable().optional().openapi({
    description: "Payment due date (YYYY-MM-DD)",
    example: "2026-03-01",
  }),
  paymentTerms: z.string().nullable().optional().openapi({
    description: "Payment terms (e.g. NET 30, Due on receipt)",
    example: "NET 30",
  }),
  lineItems: z.array(LineItemSchema).openapi({
    description: "Derived from the referenced quote (read-only; not stored)",
  }),
  subtotal: z.number().openapi({
    description: "Derived from the referenced quote (read-only; not stored)",
    example: 1152,
  }),
  tax: z.number().nullable().optional().openapi({
    description: "Derived from the referenced quote (read-only; not stored)",
  }),
  taxRate: z.number().nullable().optional().openapi({
    description: "Derived from the referenced quote (read-only; not stored)",
    example: 15,
  }),
  total: z.number().openapi({
    description: "Derived from the referenced quote (read-only; not stored)",
    example: 1152,
  }),
  paidAmount: z.number().openapi({
    description: "Total amount paid (sum of payments)",
    example: 0,
  }),
  description: z.string().nullable().optional().openapi({
    description:
      "Short client-visible summary (appears on the invoice above line items)",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Internal notes (markdown)",
  }),
  footer: z.string().nullable().optional().openapi({
    description: "Client-facing footer text",
  }),
  sentAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when invoice was sent",
  }),
  paidAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when invoice was fully paid",
  }),
  frozenAt: z.string().nullable().optional().openapi({
    description:
      "ISO timestamp when the invoice was issued and its quote snapshot " +
      "frozen. Null = draft (still derives from the quote live); set = " +
      "immutable snapshot (system-set on issue/send).",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Invoice");

export type Invoice = z.infer<typeof InvoiceSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from InvoiceSchema
// ---------------------------------------------------------------------------

export const CreateInvoiceSchema = InvoiceSchema.pick({
  quoteId: true,
  projectId: true,
  title: true,
  status: true,
  currency: true,
  dueDate: true,
  paymentTerms: true,
  description: true,
  notes: true,
  footer: true,
}).partial({
  status: true,
  projectId: true,
  title: true,
  currency: true,
  dueDate: true,
  paymentTerms: true,
  description: true,
  notes: true,
  footer: true,
}).openapi("CreateInvoice");

export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().openapi(
  "UpdateInvoice",
);

export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListInvoiceOptionsSchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
  }),
  customerId: z.string().optional().openapi({
    param: { name: "customerId", in: "query" },
    description: "Filter by customer ID",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, number, notes)",
  }),
});

export type ListInvoiceOptions = z.infer<typeof ListInvoiceOptionsSchema>;

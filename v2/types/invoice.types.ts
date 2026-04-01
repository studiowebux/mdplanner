/**
 * Invoice types — Zod schemas (single source), inferred types.
 * Bills sent to customers with enhanced line items and payment tracking.
 */

import { z } from "@hono/zod-openapi";
import { LineItemSchema } from "./billing.types.ts";

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

export const INVOICE_COMPLETED_STATUSES = new Set<InvoiceStatus>([
  "paid",
  "cancelled",
]);

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
  customerId: z.string().openapi({
    description: "Customer ID this invoice is for",
    example: "customer_startup",
  }),
  quoteId: z.string().nullable().optional().openapi({
    description: "Source quote ID (if converted from quote)",
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
    description: "Invoice line items",
  }),
  subtotal: z.number().openapi({
    description: "Sum of line item amounts",
    example: 1152,
  }),
  tax: z.number().nullable().optional().openapi({
    description: "Computed tax amount",
  }),
  taxRate: z.number().nullable().optional().openapi({
    description: "Tax rate percentage",
    example: 15,
  }),
  total: z.number().openapi({
    description: "Grand total (subtotal + tax)",
    example: 1152,
  }),
  paidAmount: z.number().openapi({
    description: "Total amount paid (sum of payments)",
    example: 0,
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Internal notes (markdown)",
  }),
  footer: z.string().nullable().optional().openapi({
    description: "Client-facing footer text",
  }),
  createdAt: z.string().openapi({ description: "ISO creation timestamp" }),
  updatedAt: z.string().openapi({
    description: "ISO last-updated timestamp",
  }),
  sentAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when invoice was sent",
  }),
  paidAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when invoice was fully paid",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
}).openapi("Invoice");

export type Invoice = z.infer<typeof InvoiceSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from InvoiceSchema
// ---------------------------------------------------------------------------

export const CreateInvoiceSchema = InvoiceSchema.pick({
  customerId: true,
  quoteId: true,
  title: true,
  status: true,
  currency: true,
  dueDate: true,
  paymentTerms: true,
  lineItems: true,
  taxRate: true,
  notes: true,
  footer: true,
}).partial({
  status: true,
  quoteId: true,
  currency: true,
  dueDate: true,
  paymentTerms: true,
  taxRate: true,
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

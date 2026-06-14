/**
 * Quote types — Zod schemas (single source), inferred types.
 * Proposals sent to customers with enhanced line items and payment schedules.
 */

import { z } from "@hono/zod-openapi";
import { LineItemSchema } from "./billing.types.ts";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const QUOTE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "accepted",
  "rejected",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_COMPLETED_STATUSES = new Set<QuoteStatus>([
  "accepted",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const PaymentScheduleItemSchema = z.object({
  description: z.string().openapi({
    description: "Payment milestone description",
    example: "50% deposit",
  }),
  percent: z.number().nullable().optional().openapi({
    description: "Percentage of total",
    example: 50,
  }),
  amount: z.number().nullable().optional().openapi({
    description: "Fixed amount (overrides percent if both set)",
    example: 500,
  }),
  dueDate: z.string().nullable().optional().openapi({
    description: "Due date for this payment (YYYY-MM-DD)",
    example: "2026-04-01",
  }),
}).openapi("PaymentScheduleItem");

export type PaymentScheduleItem = z.infer<typeof PaymentScheduleItemSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const QuoteSchema = z.object({
  id: z.string().openapi({
    description: "Quote ID",
    example: "quote_startup",
  }),
  number: z.string().openapi({
    description: "Quote number (Q-YYYY-NNN)",
    example: "Q-2026-001",
  }),
  customerId: z.string().openapi({
    description: "Customer ID this quote is for",
    example: "customer_startup",
  }),
  projectId: z.string().nullable().optional().openapi({
    description: "Optional project this quote bills against",
    example: "project_redesign",
  }),
  title: z.string().openapi({
    description: "Quote title",
    example: "Team Plan Annual Subscription",
  }),
  status: z.enum(QUOTE_STATUSES).openapi({
    description: "Quote status",
    example: "draft",
  }),
  currency: z.string().nullable().optional().openapi({
    description: "ISO 4217 currency code (defaults to project config)",
    example: "CAD",
  }),
  expiresAt: z.string().nullable().optional().openapi({
    description: "Expiration date (YYYY-MM-DD)",
    example: "2026-04-30",
  }),
  lineItems: z.array(LineItemSchema).openapi({
    description: "Quote line items",
  }),
  paymentSchedule: z.array(PaymentScheduleItemSchema).nullable().optional()
    .openapi({
      description: "Milestone-based payment schedule",
    }),
  subtotal: z.number().openapi({
    description: "Sum of non-optional line item amounts",
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
  notes: z.string().nullable().optional().openapi({
    description: "Internal notes (markdown)",
  }),
  footer: z.string().nullable().optional().openapi({
    description: "Client-facing footer text (terms, thank-you)",
  }),
  revision: z.number().nullable().optional().openapi({
    description: "Revision number (auto-incremented on re-send)",
    example: 1,
  }),
  convertedToInvoice: z.string().nullable().optional().openapi({
    description: "Invoice ID if this quote was converted",
  }),
  sentAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when quote was sent",
  }),
  acceptedAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when quote was accepted",
  }),
  submittedForApprovalAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when quote was submitted for internal approval",
  }),
  approvedBy: z.string().nullable().optional().openapi({
    description: "Name of the person who approved this quote",
    example: "Tommy Gingras",
  }),
  approvedAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when quote was internally approved",
  }),
  approvalNotes: z.string().nullable().optional().openapi({
    description: "Notes from the approver (visible internally)",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Quote");

export type Quote = z.infer<typeof QuoteSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from QuoteSchema
// ---------------------------------------------------------------------------

export const CreateQuoteSchema = QuoteSchema.pick({
  customerId: true,
  projectId: true,
  title: true,
  status: true,
  currency: true,
  expiresAt: true,
  lineItems: true,
  paymentSchedule: true,
  taxRate: true,
  notes: true,
  footer: true,
}).partial({
  status: true,
  projectId: true,
  currency: true,
  expiresAt: true,
  paymentSchedule: true,
  taxRate: true,
  notes: true,
  footer: true,
}).openapi("CreateQuote");

export type CreateQuote = z.infer<typeof CreateQuoteSchema>;

export const UpdateQuoteSchema = CreateQuoteSchema.partial().merge(
  z.object({
    sentAt: z.string().nullable().optional(),
    acceptedAt: z.string().nullable().optional(),
    convertedToInvoice: z.string().nullable().optional(),
    revision: z.number().nullable().optional(),
    submittedForApprovalAt: z.string().nullable().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    approvalNotes: z.string().nullable().optional(),
  }),
).openapi("UpdateQuote");

export type UpdateQuote = z.infer<typeof UpdateQuoteSchema>;

// ---------------------------------------------------------------------------
// Revision history
// ---------------------------------------------------------------------------

export const QuoteRevisionSchema = z.object({
  revisionNumber: z.number().openapi({
    description: "Revision number (matches quote.revision at send time)",
    example: 1,
  }),
  snapshotAt: z.string().openapi({
    description: "ISO timestamp when this revision was snapshotted",
    example: "2026-05-16T10:00:00.000Z",
  }),
  total: z.number().openapi({
    description: "Grand total at send time",
    example: 1152,
  }),
  subtotal: z.number().openapi({
    description: "Subtotal at send time",
    example: 1000,
  }),
  currency: z.string().nullable().optional().openapi({
    description: "Currency at send time",
  }),
  lineItemCount: z.number().openapi({
    description: "Number of line items at send time",
    example: 3,
  }),
  sentBy: z.string().openapi({
    description: "Actor who triggered the send",
    example: "system",
  }),
}).openapi("QuoteRevision");

export type QuoteRevision = z.infer<typeof QuoteRevisionSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListQuoteOptionsSchema = z.object({
  status: z.enum(QUOTE_STATUSES).optional().openapi({
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

export type ListQuoteOptions = z.infer<typeof ListQuoteOptionsSchema>;

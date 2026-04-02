/**
 * Payment types — Zod schemas (single source), inferred types.
 * Records of money received against invoices.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = [
  "bank",
  "card",
  "cash",
  "cheque",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const PaymentSchema = z.object({
  id: z.string().openapi({
    description: "Payment ID",
    example: "payment_001",
  }),
  invoiceId: z.string().openapi({
    description: "Invoice ID this payment applies to",
    example: "invoice_startup1",
  }),
  amount: z.number().openapi({
    description: "Payment amount",
    example: 1152,
  }),
  date: z.string().openapi({
    description: "Payment date (YYYY-MM-DD)",
    example: "2026-02-18",
  }),
  method: z.enum(PAYMENT_METHODS).nullable().optional().openapi({
    description: "Payment method",
    example: "card",
  }),
  reference: z.string().nullable().optional().openapi({
    description: "Transaction reference (cheque #, transaction ID)",
    example: "ch_1234567890",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Payment notes",
  }),
  createdAt: z.string().openapi({ description: "ISO creation timestamp" }),
  updatedAt: z.string().openapi({
    description: "ISO last-updated timestamp",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
}).openapi("Payment");

export type Payment = z.infer<typeof PaymentSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from PaymentSchema
// ---------------------------------------------------------------------------

export const CreatePaymentSchema = PaymentSchema.pick({
  invoiceId: true,
  amount: true,
  date: true,
  method: true,
  reference: true,
  notes: true,
}).partial({
  method: true,
  reference: true,
  notes: true,
}).openapi("CreatePayment");

export type CreatePayment = z.infer<typeof CreatePaymentSchema>;

export const UpdatePaymentSchema = CreatePaymentSchema.partial().openapi(
  "UpdatePayment",
);

export type UpdatePayment = z.infer<typeof UpdatePaymentSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListPaymentOptionsSchema = z.object({
  invoiceId: z.string().optional().openapi({
    param: { name: "invoiceId", in: "query" },
    description: "Filter by invoice ID",
  }),
  method: z.enum(PAYMENT_METHODS).optional().openapi({
    param: { name: "method", in: "query" },
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches reference, notes)",
  }),
});

export type ListPaymentOptions = z.infer<typeof ListPaymentOptionsSchema>;

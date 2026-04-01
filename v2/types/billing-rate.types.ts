/**
 * BillingRate types — Zod schemas (single source), inferred types.
 * Rate cards for reusable pricing (e.g. "Senior Dev — $150/h").
 */

import { z } from "@hono/zod-openapi";
import { UNIT_TYPES } from "./billing.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const BillingRateSchema = z.object({
  id: z.string().openapi({
    description: "Billing rate ID",
    example: "rate_standard",
  }),
  name: z.string().openapi({
    description: "Rate name",
    example: "Standard Rate",
  }),
  unit: z.enum(UNIT_TYPES).openapi({
    description:
      "Unit of measure: h (hours), d (days), unit, mo (months), fixed",
    example: "h",
  }),
  rate: z.number().openapi({
    description: "Amount per unit",
    example: 150,
  }),
  currency: z.string().nullable().optional().openapi({
    description: "Currency code (defaults to project config)",
    example: "CAD",
  }),
  assignee: z.string().nullable().optional().openapi({
    description: "Person ID this rate applies to",
    example: "person_123",
  }),
  isDefault: z.boolean().nullable().optional().openapi({
    description: "Whether this is the default rate",
    example: true,
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Rate notes (markdown)",
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
}).openapi("BillingRate");

export type BillingRate = z.infer<typeof BillingRateSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from BillingRateSchema
// ---------------------------------------------------------------------------

export const CreateBillingRateSchema = BillingRateSchema.pick({
  name: true,
  unit: true,
  rate: true,
  currency: true,
  assignee: true,
  isDefault: true,
  notes: true,
}).openapi("CreateBillingRate");

export type CreateBillingRate = z.infer<typeof CreateBillingRateSchema>;

export const UpdateBillingRateSchema = CreateBillingRateSchema.partial()
  .openapi("UpdateBillingRate");

export type UpdateBillingRate = z.infer<typeof UpdateBillingRateSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListBillingRateOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name and notes)",
  }),
});

export type ListBillingRateOptions = z.infer<
  typeof ListBillingRateOptionsSchema
>;

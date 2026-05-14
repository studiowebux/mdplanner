/**
 * SAFe Agreement domain types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const SAFE_TYPES = ["pre-money", "post-money", "mfn"] as const;

export const SAFE_STATUSES = ["draft", "signed", "converted"] as const;

export type SafeType = typeof SAFE_TYPES[number];
export type SafeStatus = typeof SAFE_STATUSES[number];

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const SafeSchema = z.object({
  id: z.string().openapi({ description: "SAFE ID", example: "safe_abc123" }),
  investor: z.string().openapi({
    description: "Investor name",
    example: "Angel Investor",
  }),
  amount: z.number().openapi({
    description: "Investment amount (USD)",
    example: 250000,
  }),
  valuation_cap: z.number().openapi({
    description: "Valuation cap (USD)",
    example: 3000000,
  }),
  discount: z.number().openapi({
    description: "Discount rate (%)",
    example: 20,
  }),
  type: z.enum(SAFE_TYPES).openapi({
    description: "SAFE type",
    example: "post-money",
  }),
  date: z.string().openapi({
    description: "Agreement date (YYYY-MM-DD)",
    example: "2026-01-15",
  }),
  status: z.enum(SAFE_STATUSES).openapi({
    description: "Current status",
    example: "signed",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes",
  }),
}).merge(AuditFieldsSchema).openapi("Safe");

export type Safe = z.infer<typeof SafeSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from SafeSchema
// ---------------------------------------------------------------------------

export const CreateSafeSchema = SafeSchema.pick({
  investor: true,
  amount: true,
  valuation_cap: true,
  discount: true,
  type: true,
  date: true,
  status: true,
  notes: true,
}).partial({
  valuation_cap: true,
  discount: true,
  type: true,
  status: true,
  notes: true,
}).openapi("CreateSafe");

export type CreateSafe = z.infer<typeof CreateSafeSchema>;

export const UpdateSafeSchema = CreateSafeSchema.partial().openapi(
  "UpdateSafe",
);

export type UpdateSafe = z.infer<typeof UpdateSafeSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListSafeOptionsSchema = z.object({
  status: z.enum(SAFE_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by status",
  }),
  type: z.enum(SAFE_TYPES).optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by SAFE type",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches investor, notes)",
  }),
});

export type ListSafeOptions = z.infer<typeof ListSafeOptionsSchema>;

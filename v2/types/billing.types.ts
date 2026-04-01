/**
 * Shared billing types — LineItem Zod schemas used by Quote and Invoice.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LINE_ITEM_TYPES = [
  "service",
  "product",
  "expense",
  "text",
] as const;

export const DISCOUNT_TYPES = ["percent", "fixed"] as const;

export const UNIT_TYPES = ["h", "d", "unit", "mo", "fixed"] as const;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const LineItemSchema = z.object({
  id: z.string().openapi({
    description: "Line item ID",
    example: "li_1",
  }),
  type: z.enum(LINE_ITEM_TYPES).openapi({
    description:
      "Line item type: service (hours x rate), product (qty x price), expense (pass-through), text (description only)",
    example: "service",
  }),
  description: z.string().openapi({
    description: "Line item description (free text)",
    example: "Frontend development",
  }),
  group: z.string().nullable().optional().openapi({
    description: "Group heading for visual sectioning (e.g. 'Design Phase')",
    example: "Development",
  }),
  quantity: z.number().nullable().optional().openapi({
    description: "Quantity (hours, units, days). Null for text lines.",
    example: 40,
  }),
  unit: z.enum(UNIT_TYPES).nullable().optional().openapi({
    description:
      "Unit of measure: h (hours), d (days), unit, mo (months), fixed",
    example: "h",
  }),
  unitRate: z.number().nullable().optional().openapi({
    description: "Cost per unit",
    example: 150,
  }),
  discount: z.number().nullable().optional().openapi({
    description: "Discount value (interpreted by discountType)",
    example: 10,
  }),
  discountType: z.enum(DISCOUNT_TYPES).nullable().optional().openapi({
    description: "How to interpret discount: percent (%) or fixed ($)",
    example: "percent",
  }),
  taxable: z.boolean().nullable().optional().openapi({
    description: "Whether this line is subject to tax (default true)",
    example: true,
  }),
  optional: z.boolean().nullable().optional().openapi({
    description:
      "Quote-only: optional line the client can opt in/out of. Excluded from totals.",
    example: false,
  }),
  rateId: z.string().nullable().optional().openapi({
    description: "Link to a BillingRate for auto-fill",
    example: "rate_senior_dev",
  }),
  taskId: z.string().nullable().optional().openapi({
    description: "Link to a task (for time-based billing)",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Internal notes (not shown on client-facing documents)",
  }),
  amount: z.number().openapi({
    description:
      "Computed amount: (quantity x unitRate) - discount. Zero for text lines.",
    example: 5400,
  }),
}).openapi("LineItem");

export type LineItem = z.infer<typeof LineItemSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from LineItemSchema
// ---------------------------------------------------------------------------

export const CreateLineItemSchema = LineItemSchema.pick({
  type: true,
  description: true,
  group: true,
  quantity: true,
  unit: true,
  unitRate: true,
  discount: true,
  discountType: true,
  taxable: true,
  optional: true,
  rateId: true,
  taskId: true,
  notes: true,
}).partial({
  group: true,
  quantity: true,
  unit: true,
  unitRate: true,
  discount: true,
  discountType: true,
  taxable: true,
  optional: true,
  rateId: true,
  taskId: true,
  notes: true,
}).openapi("CreateLineItem");

export type CreateLineItem = z.infer<typeof CreateLineItemSchema>;

export const UpdateLineItemSchema = CreateLineItemSchema.partial().openapi(
  "UpdateLineItem",
);

export type UpdateLineItem = z.infer<typeof UpdateLineItemSchema>;

// ---------------------------------------------------------------------------
// Shared billing constants
// ---------------------------------------------------------------------------

export type LineItemType = (typeof LINE_ITEM_TYPES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export type UnitType = (typeof UNIT_TYPES)[number];

// ---------------------------------------------------------------------------
// Shared billing component props
// ---------------------------------------------------------------------------

export type BillingTotalsProps = {
  subtotal: number;
  discount?: number | null;
  tax?: number | null;
  taxRate?: number | null;
  total: number;
  paidAmount?: number | null;
};

export type LineItemsTableProps = {
  items: LineItem[];
  showOptional?: boolean;
};

/**
 * Finance types — Zod schemas (single source), inferred types.
 * Individual income and expense entries. Use tags for categorization.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FINANCE_TYPES = ["income", "expense"] as const;
export type FinanceType = (typeof FINANCE_TYPES)[number];

export const FINANCE_TYPE_LABELS: Record<FinanceType, string> = {
  income: "Income",
  expense: "Expense",
};

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const FinanceSchema = z.object({
  id: z.string().openapi({
    description: "Finance entry ID",
    example: "finance_saas_revenue_jan",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "Entry title",
    example: "SaaS Revenue — January",
  }),
  type: z.enum(FINANCE_TYPES).openapi({
    description: "Income or expense",
    example: "income",
  }),
  amount: z.number().openapi({
    description: "Amount (absolute value, sign determined by type)",
    example: 4200,
  }),
  currency: z.string().nullable().optional().openapi({
    description: "ISO 4217 currency code",
    example: "CAD",
  }),
  date: z.string().nullable().optional().openapi({
    description: "Transaction date (YYYY-MM-DD)",
    example: "2026-01-31",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Notes or context (markdown)",
  }),
  tags: stringArray.nullable().optional().openapi({
    description: "Tags for categorization (e.g. saas, salary, hosting)",
    example: ["saas", "recurring"],
  }),
}).merge(AuditFieldsSchema).openapi("Finance");

export type Finance = z.infer<typeof FinanceSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from FinanceSchema
// ---------------------------------------------------------------------------

export const CreateFinanceSchema = FinanceSchema.pick({
  title: true,
  type: true,
  amount: true,
  currency: true,
  date: true,
  description: true,
  tags: true,
}).partial({
  currency: true,
  date: true,
  description: true,
  tags: true,
}).openapi("CreateFinance");

export type CreateFinance = z.infer<typeof CreateFinanceSchema>;

export const UpdateFinanceSchema = CreateFinanceSchema.partial().openapi(
  "UpdateFinance",
);

export type UpdateFinance = z.infer<typeof UpdateFinanceSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListFinanceOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, tags, description)",
  }),
  type: z.enum(FINANCE_TYPES).optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by income or expense",
  }),
  tag: z.string().optional().openapi({
    param: { name: "tag", in: "query" },
    description: "Filter by tag (case-insensitive)",
  }),
  from: z.string().optional().openapi({
    param: { name: "from", in: "query" },
    description: "Start date filter (YYYY-MM-DD, inclusive)",
  }),
  to: z.string().optional().openapi({
    param: { name: "to", in: "query" },
    description: "End date filter (YYYY-MM-DD, inclusive)",
  }),
});

export type ListFinanceOptions = z.infer<typeof ListFinanceOptionsSchema>;

// ---------------------------------------------------------------------------
// Summary — aggregated totals
// ---------------------------------------------------------------------------

export const FinanceSummarySchema = z.object({
  totalIncome: z.number(),
  totalExpense: z.number(),
  balance: z.number(),
  byTag: z.array(z.object({
    tag: z.string(),
    type: z.enum(FINANCE_TYPES),
    total: z.number(),
  })),
}).openapi("FinanceSummary");

export type FinanceSummary = z.infer<typeof FinanceSummarySchema>;

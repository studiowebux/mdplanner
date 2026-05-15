/**
 * Investor domain types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const INVESTOR_TYPES = [
  "vc",
  "angel",
  "family_office",
  "corporate",
  "accelerator",
] as const;

export const INVESTOR_STAGES = [
  "lead",
  "associate",
  "partner",
  "passed",
] as const;

export const INVESTOR_STATUSES = [
  "not_started",
  "in_progress",
  "term_sheet",
  "passed",
  "invested",
] as const;

export type InvestorType = typeof INVESTOR_TYPES[number];
export type InvestorStage = typeof INVESTOR_STAGES[number];
export type InvestorStatus = typeof INVESTOR_STATUSES[number];

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const InvestorSchema = z.object({
  id: z.string().openapi({
    description: "Investor ID",
    example: "investor_abc123",
  }),
  name: z.string().openapi({
    description: "Investor or firm name",
    example: "Acme Ventures",
  }),
  type: z.enum(INVESTOR_TYPES).openapi({
    description: "Investor type",
    example: "vc",
  }),
  stage: z.enum(INVESTOR_STAGES).openapi({
    description: "Outreach stage",
    example: "lead",
  }),
  status: z.enum(INVESTOR_STATUSES).openapi({
    description: "Deal status",
    example: "not_started",
  }),
  amountTarget: z.number().nullable().optional().openapi({
    description: "Target investment amount",
    example: 500000,
  }),
  contact: z.string().nullable().optional().openapi({
    description: "Primary contact name or email",
  }),
  introDate: z.string().nullable().optional().openapi({
    description: "Date of first introduction (ISO 8601)",
    example: "2026-01-15",
  }),
  lastContact: z.string().nullable().optional().openapi({
    description: "Date of most recent contact (ISO 8601)",
    example: "2026-03-20",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes (markdown)",
  }),
  tags: stringArray.optional().openapi({
    description: "Tags",
  }),
}).merge(AuditFieldsSchema).openapi("Investor");

export type Investor = z.infer<typeof InvestorSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from InvestorSchema
// ---------------------------------------------------------------------------

export const CreateInvestorSchema = InvestorSchema.pick({
  name: true,
  type: true,
  stage: true,
  status: true,
  amountTarget: true,
  contact: true,
  introDate: true,
  lastContact: true,
  notes: true,
  tags: true,
}).partial({
  amountTarget: true,
  contact: true,
  introDate: true,
  lastContact: true,
  notes: true,
  tags: true,
}).openapi("CreateInvestor");

export type CreateInvestor = z.infer<typeof CreateInvestorSchema>;

export const UpdateInvestorSchema = CreateInvestorSchema.partial().openapi(
  "UpdateInvestor",
);

export type UpdateInvestor = z.infer<typeof UpdateInvestorSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListInvestorOptionsSchema = z.object({
  type: z.enum(INVESTOR_TYPES).optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by investor type",
  }),
  stage: z.enum(INVESTOR_STAGES).optional().openapi({
    param: { name: "stage", in: "query" },
    description: "Filter by outreach stage",
  }),
  status: z.enum(INVESTOR_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by deal status",
  }),
  tag: z.string().optional().openapi({
    param: { name: "tag", in: "query" },
    description: "Filter by tag",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, contact, notes)",
  }),
});

export type ListInvestorOptions = z.infer<typeof ListInvestorOptionsSchema>;

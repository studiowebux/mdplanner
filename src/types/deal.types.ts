/**
 * Deal types — Zod schemas (single source), inferred types.
 * CRM deals with stage tracking and value.
 */

import { z } from "@hono/zod-openapi";
import {
  ArchiveFieldsSchema,
  AuditFieldsSchema,
  stringArray,
} from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEAL_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  "lead": "Lead",
  "qualified": "Qualified",
  "proposal": "Proposal",
  "negotiation": "Negotiation",
  "closed-won": "Closed Won",
  "closed-lost": "Closed Lost",
};

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const DealSchema = z.object({
  id: z.string().openapi({
    description: "Deal ID",
    example: "deal_acme_website",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "Deal title",
    example: "Acme Corp — Website Redesign",
  }),
  stage: z.enum(DEAL_STAGES).openapi({
    description: "Current pipeline stage",
    example: "proposal",
  }),
  value: z.number().nullable().optional().openapi({
    description: "Deal value (in project currency)",
    example: 15000,
  }),
  currency: z.string().nullable().optional().openapi({
    description: "ISO 4217 currency code",
    example: "CAD",
  }),
  company: z.string().nullable().optional().openapi({
    description: "Company or organization name",
    example: "Acme Corp",
  }),
  contact: z.string().nullable().optional().openapi({
    description: "Primary contact name",
    example: "Jane Doe",
  }),
  assignee: z.string().nullable().optional().openapi({
    description: "Team member responsible for this deal",
    example: "Tommy",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Deal notes and context (markdown)",
  }),
  tags: stringArray.nullable().optional().openapi({
    description: "Tags for grouping/filtering",
    example: ["q2-2026", "enterprise"],
  }),
  closedAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp when deal was closed (won or lost)",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Deal");

export type Deal = z.infer<typeof DealSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from DealSchema
// ---------------------------------------------------------------------------

export const CreateDealSchema = DealSchema.pick({
  title: true,
  stage: true,
  value: true,
  currency: true,
  company: true,
  contact: true,
  assignee: true,
  description: true,
  tags: true,
  closedAt: true,
}).partial({
  stage: true,
  value: true,
  currency: true,
  company: true,
  contact: true,
  assignee: true,
  description: true,
  tags: true,
  closedAt: true,
}).openapi("CreateDeal");

export type CreateDeal = z.infer<typeof CreateDealSchema>;

export const UpdateDealSchema = CreateDealSchema.partial().openapi(
  "UpdateDeal",
);

export type UpdateDeal = z.infer<typeof UpdateDealSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListDealOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, company, contact, description)",
  }),
  stage: z.enum(DEAL_STAGES).optional().openapi({
    param: { name: "stage", in: "query" },
    description: "Filter by pipeline stage",
  }),
  assignee: z.string().optional().openapi({
    param: { name: "assignee", in: "query" },
    description: "Filter by assignee name",
  }),
  company: z.string().optional().openapi({
    param: { name: "company", in: "query" },
    description: "Filter by company (case-insensitive)",
  }),
});

export type ListDealOptions = z.infer<typeof ListDealOptionsSchema>;

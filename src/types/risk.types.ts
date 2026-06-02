/**
 * Risk domain types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import {
  ArchiveFieldsSchema,
  AuditFieldsSchema,
  stringArray,
} from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const RISK_CATEGORIES = [
  "operational",
  "financial",
  "technical",
  "strategic",
  "compliance",
  "other",
] as const;

export const RISK_STATUSES = [
  "open",
  "mitigated",
  "closed",
  "accepted",
] as const;

export type RiskCategory = typeof RISK_CATEGORIES[number];
export type RiskStatus = typeof RISK_STATUSES[number];

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const RiskSchema = z.object({
  id: z.string().openapi({ description: "Risk ID", example: "risk_abc123" }),
  title: z.string().openapi({
    description: "Risk title",
    example: "Database outage during peak hours",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Detailed description (markdown)",
  }),
  category: z.enum(RISK_CATEGORIES).openapi({
    description: "Risk category",
    example: "technical",
  }),
  likelihood: z.number().int().min(1).max(5).openapi({
    description: "Likelihood score 1–5",
    example: 3,
  }),
  impact: z.number().int().min(1).max(5).openapi({
    description: "Impact score 1–5",
    example: 4,
  }),
  status: z.enum(RISK_STATUSES).openapi({
    description: "Current status",
    example: "open",
  }),
  mitigation: z.string().nullable().optional().openapi({
    description: "Mitigation plan (markdown)",
  }),
  owner: z.string().nullable().optional().openapi({
    description: "Risk owner (person name or ID)",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  tags: stringArray.optional().openapi({
    description: "Tags",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Risk");

export type Risk = z.infer<typeof RiskSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from RiskSchema
// ---------------------------------------------------------------------------

export const CreateRiskSchema = RiskSchema.pick({
  title: true,
  description: true,
  category: true,
  likelihood: true,
  impact: true,
  status: true,
  mitigation: true,
  owner: true,
  project: true,
  tags: true,
}).partial({
  description: true,
  mitigation: true,
  owner: true,
  project: true,
  tags: true,
}).openapi("CreateRisk");

export type CreateRisk = z.infer<typeof CreateRiskSchema>;

export const UpdateRiskSchema = CreateRiskSchema.partial().openapi(
  "UpdateRisk",
);

export type UpdateRisk = z.infer<typeof UpdateRiskSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListRiskOptionsSchema = z.object({
  category: z.enum(RISK_CATEGORIES).optional().openapi({
    param: { name: "category", in: "query" },
    description: "Filter by category",
  }),
  status: z.enum(RISK_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by status",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, description, mitigation)",
  }),
});

export type ListRiskOptions = z.infer<typeof ListRiskOptionsSchema>;

/**
 * Brief types — Zod schemas (single source), inferred types.
 * Planning documents with RACI matrix and structured sections.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const BriefSchema = z.object({
  id: z.string().openapi({
    description: "Brief ID",
    example: "brief_beta",
  }),
  title: z.string().openapi({
    description: "Brief title",
    example: "Beta Launch Brief",
  }),
  date: z.string().nullable().optional().openapi({
    description: "Brief date (YYYY-MM-DD)",
    example: "2026-02-01",
  }),
  summary: z.array(z.string()).nullable().optional().openapi({
    description: "Executive summary items",
  }),
  mission: z.array(z.string()).nullable().optional().openapi({
    description: "Mission statement items",
  }),
  responsible: z.array(z.string()).nullable().optional().openapi({
    description: "RACI — Responsible parties",
  }),
  accountable: z.array(z.string()).nullable().optional().openapi({
    description: "RACI — Accountable parties",
  }),
  consulted: z.array(z.string()).nullable().optional().openapi({
    description: "RACI — Consulted parties",
  }),
  informed: z.array(z.string()).nullable().optional().openapi({
    description: "RACI — Informed parties",
  }),
  highLevelBudget: z.array(z.string()).nullable().optional().openapi({
    description: "High-level budget items",
  }),
  highLevelTimeline: z.array(z.string()).nullable().optional().openapi({
    description: "High-level timeline items",
  }),
  culture: z.array(z.string()).nullable().optional().openapi({
    description: "Culture and values",
  }),
  changeCapacity: z.array(z.string()).nullable().optional().openapi({
    description: "Change capacity assessment",
  }),
  guidingPrinciples: z.array(z.string()).nullable().optional().openapi({
    description: "Guiding principles",
  }),
}).merge(AuditFieldsSchema).openapi("Brief");

export type Brief = z.infer<typeof BriefSchema>;

// ---------------------------------------------------------------------------
// Section metadata — used by repository parser and detail view
// ---------------------------------------------------------------------------

export const BRIEF_SECTIONS = [
  {
    key: "summary",
    label: "Summary",
    keywords: ["summary", "executive summary", "overview"],
  },
  { key: "mission", label: "Mission", keywords: ["mission"] },
  { key: "responsible", label: "Responsible (R)", keywords: ["responsible"] },
  { key: "accountable", label: "Accountable (A)", keywords: ["accountable"] },
  { key: "consulted", label: "Consulted (C)", keywords: ["consulted"] },
  { key: "informed", label: "Informed (I)", keywords: ["informed"] },
  {
    key: "highLevelBudget",
    label: "High-Level Budget",
    keywords: ["budget", "high level budget", "high-level budget"],
  },
  {
    key: "highLevelTimeline",
    label: "High-Level Timeline",
    keywords: ["timeline", "high level timeline", "high-level timeline"],
  },
  { key: "culture", label: "Culture", keywords: ["culture"] },
  {
    key: "changeCapacity",
    label: "Change Capacity",
    keywords: ["change capacity", "capacity for change"],
  },
  {
    key: "guidingPrinciples",
    label: "Guiding Principles",
    keywords: ["guiding principle", "guiding principles", "principles"],
  },
] as const;

export type BriefSectionKey = (typeof BRIEF_SECTIONS)[number]["key"];

// ---------------------------------------------------------------------------
// Create / Update — derived from BriefSchema
// ---------------------------------------------------------------------------

export const CreateBriefSchema = BriefSchema.pick({
  title: true,
  date: true,
  summary: true,
  mission: true,
  responsible: true,
  accountable: true,
  consulted: true,
  informed: true,
  highLevelBudget: true,
  highLevelTimeline: true,
  culture: true,
  changeCapacity: true,
  guidingPrinciples: true,
}).partial({
  date: true,
  summary: true,
  mission: true,
  responsible: true,
  accountable: true,
  consulted: true,
  informed: true,
  highLevelBudget: true,
  highLevelTimeline: true,
  culture: true,
  changeCapacity: true,
  guidingPrinciples: true,
}).openapi("CreateBrief");

export type CreateBrief = z.infer<typeof CreateBriefSchema>;

export const UpdateBriefSchema = CreateBriefSchema.partial().openapi(
  "UpdateBrief",
);

export type UpdateBrief = z.infer<typeof UpdateBriefSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListBriefOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, summary, mission)",
  }),
});

export type ListBriefOptions = z.infer<typeof ListBriefOptionsSchema>;

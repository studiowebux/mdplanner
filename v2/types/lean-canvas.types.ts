/**
 * Lean Canvas types — Zod schemas (single source), inferred types.
 * Business model canvas with 12 sections for product/market analysis.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schema — single source of truth
// ---------------------------------------------------------------------------

export const LeanCanvasSchema = z.object({
  id: z.string().openapi({
    description: "Lean Canvas ID",
    example: "lean_canvas_1234567890_abcd",
  }),
  title: z.string().openapi({
    description: "Canvas title",
    example: "TaskFlow Lean Canvas",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Associated project name",
    example: "TaskFlow",
  }),
  date: z.string().nullable().optional().openapi({
    description: "Canvas date (YYYY-MM-DD)",
    example: "2026-01-05",
  }),
  // 12 lean canvas sections
  problem: stringArray.default([]).openapi({
    description: "Top 3 problems the product solves",
  }),
  solution: stringArray.default([]).openapi({
    description: "Top 3 solutions",
  }),
  uniqueValueProp: stringArray.default([]).openapi({
    description: "Single, clear, compelling message why you are different",
  }),
  unfairAdvantage: stringArray.default([]).openapi({
    description: "Cannot be easily copied or bought",
  }),
  customerSegments: stringArray.default([]).openapi({
    description: "Target customers and users",
  }),
  existingAlternatives: stringArray.default([]).openapi({
    description: "Existing alternatives and competitors",
  }),
  keyMetrics: stringArray.default([]).openapi({
    description: "Key activities you measure",
  }),
  highLevelConcept: stringArray.default([]).openapi({
    description: "High-level concept / elevator pitch analogy",
  }),
  channels: stringArray.default([]).openapi({
    description: "Path to customers",
  }),
  earlyAdopters: stringArray.default([]).openapi({
    description: "Characteristics of the ideal early customers",
  }),
  costStructure: stringArray.default([]).openapi({
    description:
      "Customer acquisition costs, distribution costs, hosting, etc.",
  }),
  revenueStreams: stringArray.default([]).openapi({
    description: "Revenue model, lifetime value, revenue, gross margin",
  }),
  // Computed
  completedSections: z.number().openapi({
    description: "Number of sections with at least one item (0–12)",
  }),
  sectionCount: z.number().openapi({
    description: "Total number of bullet items across all 12 sections",
  }),
  completionPct: z.number().openapi({
    description: "Completion percentage (0–100)",
  }),
}).merge(AuditFieldsSchema).openapi("LeanCanvas");

export type LeanCanvas = z.infer<typeof LeanCanvasSchema>;

// ---------------------------------------------------------------------------
// Section metadata — used by repository parser and detail view
// ---------------------------------------------------------------------------

export const LEAN_CANVAS_SECTIONS = [
  {
    key: "problem",
    label: "Problem",
    keywords: ["problem", "problems"],
  },
  {
    key: "solution",
    label: "Solution",
    keywords: ["solution", "solutions"],
  },
  {
    key: "uniqueValueProp",
    label: "Unique Value Proposition",
    keywords: ["unique value proposition", "uvp", "value proposition"],
  },
  {
    key: "unfairAdvantage",
    label: "Unfair Advantage",
    keywords: ["unfair advantage"],
  },
  {
    key: "customerSegments",
    label: "Customer Segments",
    keywords: ["customer segments", "customers"],
  },
  {
    key: "existingAlternatives",
    label: "Existing Alternatives",
    keywords: ["existing alternatives", "alternatives"],
  },
  {
    key: "keyMetrics",
    label: "Key Metrics",
    keywords: ["key metrics", "metrics"],
  },
  {
    key: "highLevelConcept",
    label: "High-Level Concept",
    keywords: ["high-level concept", "concept"],
  },
  {
    key: "channels",
    label: "Channels",
    keywords: ["channels"],
  },
  {
    key: "earlyAdopters",
    label: "Early Adopters",
    keywords: ["early adopters", "adopters"],
  },
  {
    key: "costStructure",
    label: "Cost Structure",
    keywords: ["cost structure", "costs"],
  },
  {
    key: "revenueStreams",
    label: "Revenue Streams",
    keywords: ["revenue streams", "revenue"],
  },
] as const;

export type LeanCanvasSectionKey = (typeof LEAN_CANVAS_SECTIONS)[number]["key"];

// ---------------------------------------------------------------------------
// Create / Update — derived from LeanCanvasSchema
// ---------------------------------------------------------------------------

export const CreateLeanCanvasSchema = LeanCanvasSchema.pick({
  title: true,
  project: true,
  date: true,
  problem: true,
  solution: true,
  uniqueValueProp: true,
  unfairAdvantage: true,
  customerSegments: true,
  existingAlternatives: true,
  keyMetrics: true,
  highLevelConcept: true,
  channels: true,
  earlyAdopters: true,
  costStructure: true,
  revenueStreams: true,
}).partial({
  project: true,
  date: true,
  problem: true,
  solution: true,
  uniqueValueProp: true,
  unfairAdvantage: true,
  customerSegments: true,
  existingAlternatives: true,
  keyMetrics: true,
  highLevelConcept: true,
  channels: true,
  earlyAdopters: true,
  costStructure: true,
  revenueStreams: true,
}).openapi("CreateLeanCanvas");

export type CreateLeanCanvas = z.infer<typeof CreateLeanCanvasSchema>;

export const UpdateLeanCanvasSchema = CreateLeanCanvasSchema.partial()
  .openapi("UpdateLeanCanvas");

export type UpdateLeanCanvas = z.infer<typeof UpdateLeanCanvasSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListLeanCanvasOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and all section items)",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
});

export type ListLeanCanvasOptions = z.infer<typeof ListLeanCanvasOptionsSchema>;

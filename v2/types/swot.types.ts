/**
 * SWOT Analysis types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const SwotSchema = z.object({
  id: z.string().openapi({ description: "SWOT ID", example: "swot_q1" }),
  title: z.string().openapi({
    description: "SWOT analysis title",
    example: "Q1 2026 SWOT Analysis",
  }),
  date: z.string().openapi({
    description: "Analysis date (YYYY-MM-DD)",
    example: "2026-01-15",
  }),
  strengths: z.array(z.string()).openapi({
    description: "Strength items",
  }),
  weaknesses: z.array(z.string()).openapi({
    description: "Weakness items",
  }),
  opportunities: z.array(z.string()).openapi({
    description: "Opportunity items",
  }),
  threats: z.array(z.string()).openapi({
    description: "Threat items",
  }),
  project: z.string().optional().openapi({
    description: "Linked project name",
  }),
  notes: z.string().optional().openapi({
    description: "Additional notes (markdown)",
  }),
  created: z.string().openapi({ description: "ISO creation timestamp" }),
  updated: z.string().openapi({ description: "ISO last-updated timestamp" }),
}).openapi("Swot");

export type Swot = z.infer<typeof SwotSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from SwotSchema
// ---------------------------------------------------------------------------

export const CreateSwotSchema = SwotSchema.pick({
  title: true,
  date: true,
  strengths: true,
  weaknesses: true,
  opportunities: true,
  threats: true,
  project: true,
  notes: true,
}).partial({
  date: true,
  strengths: true,
  weaknesses: true,
  opportunities: true,
  threats: true,
}).openapi("CreateSwot");

export type CreateSwot = z.infer<typeof CreateSwotSchema>;

export const UpdateSwotSchema = CreateSwotSchema.partial().openapi(
  "UpdateSwot",
);

export type UpdateSwot = z.infer<typeof UpdateSwotSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListSwotOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and quadrant items)",
  }),
});

export type ListSwotOptions = z.infer<typeof ListSwotOptionsSchema>;

/**
 * MoSCoW Analysis types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const MoscowSchema = z.object({
  id: z.string().openapi({ description: "MoSCoW ID", example: "moscow_q1" }),
  title: z.string().openapi({
    description: "MoSCoW analysis title",
    example: "Q1 2026 MoSCoW Analysis",
  }),
  date: z.string().openapi({
    description: "Analysis date (YYYY-MM-DD)",
    example: "2026-01-15",
  }),
  must: stringArray.openapi({
    description: "Must Have items",
  }),
  should: stringArray.openapi({
    description: "Should Have items",
  }),
  could: stringArray.openapi({
    description: "Could Have items",
  }),
  wont: stringArray.openapi({
    description: "Won't Have items",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).openapi("Moscow");

export type Moscow = z.infer<typeof MoscowSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from MoscowSchema
// ---------------------------------------------------------------------------

export const CreateMoscowSchema = MoscowSchema.pick({
  title: true,
  date: true,
  must: true,
  should: true,
  could: true,
  wont: true,
  project: true,
  notes: true,
}).partial({
  date: true,
  must: true,
  should: true,
  could: true,
  wont: true,
}).openapi("CreateMoscow");

export type CreateMoscow = z.infer<typeof CreateMoscowSchema>;

export const UpdateMoscowSchema = CreateMoscowSchema.partial().openapi(
  "UpdateMoscow",
);

export type UpdateMoscow = z.infer<typeof UpdateMoscowSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListMoscowOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and quadrant items)",
  }),
});

export type ListMoscowOptions = z.infer<typeof ListMoscowOptionsSchema>;

/**
 * Eisenhower Matrix types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import {
  ArchiveFieldsSchema,
  AuditFieldsSchema,
  stringArray,
} from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const EisenhowerSchema = z.object({
  id: z.string().openapi({
    description: "Eisenhower ID",
    example: "eisenhower_q1_2026",
  }),
  title: z.string().openapi({
    description: "Matrix title",
    example: "Q1 2026 Priorities",
  }),
  date: z.string().openapi({
    description: "Analysis date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  urgentImportant: stringArray.openapi({
    description: "Q1 — Urgent & Important (Do First)",
  }),
  notUrgentImportant: stringArray.openapi({
    description: "Q2 — Not Urgent & Important (Schedule)",
  }),
  urgentNotImportant: stringArray.openapi({
    description: "Q3 — Urgent & Not Important (Delegate)",
  }),
  notUrgentNotImportant: stringArray.openapi({
    description: "Q4 — Not Urgent & Not Important (Eliminate)",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Eisenhower");

export type Eisenhower = z.infer<typeof EisenhowerSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from EisenhowerSchema
// ---------------------------------------------------------------------------

export const CreateEisenhowerSchema = EisenhowerSchema.pick({
  title: true,
  date: true,
  urgentImportant: true,
  notUrgentImportant: true,
  urgentNotImportant: true,
  notUrgentNotImportant: true,
  project: true,
  notes: true,
}).partial({
  date: true,
  urgentImportant: true,
  notUrgentImportant: true,
  urgentNotImportant: true,
  notUrgentNotImportant: true,
}).openapi("CreateEisenhower");

export type CreateEisenhower = z.infer<typeof CreateEisenhowerSchema>;

export const UpdateEisenhowerSchema = CreateEisenhowerSchema.partial().openapi(
  "UpdateEisenhower",
);

export type UpdateEisenhower = z.infer<typeof UpdateEisenhowerSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListEisenhowerOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and quadrant items)",
  }),
});

export type ListEisenhowerOptions = z.infer<typeof ListEisenhowerOptionsSchema>;

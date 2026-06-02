/**
 * Project Value Board types — Zod schemas (single source), inferred types.
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

export const ProjectValueBoardSchema = z.object({
  id: z.string().openapi({
    description: "Project Value Board ID",
    example: "value_1740700001000_abc123",
  }),
  title: z.string().openapi({
    description: "Board title",
    example: "Q1 Value Assessment",
  }),
  date: z.string().openapi({
    description: "Board date (YYYY-MM-DD)",
    example: "2026-01-15",
  }),
  customerSegments: stringArray.openapi({ description: "Customer Segments" }),
  problem: stringArray.openapi({ description: "Problems / Pain Points" }),
  solution: stringArray.openapi({ description: "Solutions" }),
  benefit: stringArray.openapi({ description: "Benefits / Value" }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi(
  "ProjectValueBoard",
);

export type ProjectValueBoard = z.infer<typeof ProjectValueBoardSchema>;

// ---------------------------------------------------------------------------
// Section keys
// ---------------------------------------------------------------------------

export const PROJECT_VALUE_BOARD_SECTION_KEYS = [
  "customerSegments",
  "problem",
  "solution",
  "benefit",
] as const;

export type ProjectValueBoardSectionKey =
  typeof PROJECT_VALUE_BOARD_SECTION_KEYS[number];

// ---------------------------------------------------------------------------
// Create / Update — derived from ProjectValueBoardSchema
// ---------------------------------------------------------------------------

export const CreateProjectValueBoardSchema = ProjectValueBoardSchema.pick({
  title: true,
  date: true,
  customerSegments: true,
  problem: true,
  solution: true,
  benefit: true,
  project: true,
  notes: true,
}).partial({
  date: true,
  customerSegments: true,
  problem: true,
  solution: true,
  benefit: true,
  project: true,
  notes: true,
}).openapi("CreateProjectValueBoard");

export type CreateProjectValueBoard = z.infer<
  typeof CreateProjectValueBoardSchema
>;

export const UpdateProjectValueBoardSchema = CreateProjectValueBoardSchema
  .partial().openapi("UpdateProjectValueBoard");

export type UpdateProjectValueBoard = z.infer<
  typeof UpdateProjectValueBoardSchema
>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListProjectValueBoardOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, notes)",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by linked project name",
  }),
});

export type ListProjectValueBoardOptions = z.infer<
  typeof ListProjectValueBoardOptionsSchema
>;

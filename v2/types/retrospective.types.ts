/**
 * Retrospective types — Zod schemas (single source), inferred types.
 * Sprint/iteration retrospectives with continue/stop/start sections.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const RetrospectiveSchema = z.object({
  id: z.string().openapi({
    description: "Retrospective ID",
    example: "retro_sprint1",
  }),
  title: z.string().openapi({
    description: "Retrospective title",
    example: "Sprint 1 Retrospective",
  }),
  date: z.string().nullable().optional().openapi({
    description: "Retrospective date (YYYY-MM-DD)",
    example: "2026-01-31",
  }),
  status: z.enum(["open", "closed"]).openapi({
    description: "Retrospective status",
    example: "closed",
  }),
  continue: stringArray.openapi({
    description: "Things to continue doing (went well)",
  }),
  stop: stringArray.openapi({
    description: "Things to stop doing (needs improvement)",
  }),
  start: stringArray.openapi({
    description: "Things to start doing (actions)",
  }),
  participants: stringArray.openapi({
    description: "People who attended the retrospective",
  }),
}).merge(AuditFieldsSchema).openapi("Retrospective");

export type Retrospective = z.infer<typeof RetrospectiveSchema>;

// ---------------------------------------------------------------------------
// Section metadata — used by repository parser and detail view
// ---------------------------------------------------------------------------

export const RETROSPECTIVE_SECTIONS = [
  {
    key: "continue",
    label: "Continue (Went Well)",
    keywords: ["continue", "went well", "keep doing"],
  },
  {
    key: "stop",
    label: "Stop (Needs Improvement)",
    keywords: ["stop", "improve", "needs improvement"],
  },
  {
    key: "start",
    label: "Start (Actions)",
    keywords: ["start", "action", "try"],
  },
] as const;

export type RetrospectiveSectionKey =
  (typeof RETROSPECTIVE_SECTIONS)[number]["key"];

// ---------------------------------------------------------------------------
// Create / Update — derived from RetrospectiveSchema
// ---------------------------------------------------------------------------

export const CreateRetrospectiveSchema = RetrospectiveSchema.pick({
  title: true,
  date: true,
  status: true,
  continue: true,
  stop: true,
  start: true,
  participants: true,
}).partial({
  date: true,
  status: true,
  continue: true,
  stop: true,
  start: true,
  participants: true,
}).merge(AuditFieldsSchema.partial()).openapi("CreateRetrospective");

export type CreateRetrospective = z.infer<typeof CreateRetrospectiveSchema>;

export const UpdateRetrospectiveSchema = CreateRetrospectiveSchema.partial()
  .openapi("UpdateRetrospective");

export type UpdateRetrospective = z.infer<typeof UpdateRetrospectiveSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListRetrospectiveOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, continue, stop, start items)",
  }),
  status: z.enum(["open", "closed"]).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by status",
  }),
});

export type ListRetrospectiveOptions = z.infer<
  typeof ListRetrospectiveOptionsSchema
>;

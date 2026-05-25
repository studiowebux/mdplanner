/**
 * Fishbone (Ishikawa) diagram types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const FishboneCauseSchema = z.object({
  section: z.string().openapi({
    description: "Cause category name",
    example: "Process",
  }),
  items: z.array(z.string()).openapi({
    description: "Cause items in this category",
  }),
}).openapi("FishboneCause");

export type FishboneCause = z.infer<typeof FishboneCauseSchema>;

export const FishboneSchema = z.object({
  id: z.string().openapi({
    description: "Fishbone ID",
    example: "fishbone_1740700001000_ex3c4d",
  }),
  title: z.string().openapi({
    description: "Problem statement or diagram title",
    example: "Customer Churn Increase",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Problem description or context",
    example: "Why are monthly cancellations up 18% this quarter?",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  causes: z.array(FishboneCauseSchema).openapi({
    description: "Cause categories with their items",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Fishbone");

export type Fishbone = z.infer<typeof FishboneSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from FishboneSchema
// ---------------------------------------------------------------------------

export const CreateFishboneSchema = FishboneSchema.pick({
  title: true,
  description: true,
  project: true,
  causes: true,
}).partial({
  description: true,
  project: true,
  causes: true,
}).openapi("CreateFishbone");

export type CreateFishbone = z.infer<typeof CreateFishboneSchema>;

export const UpdateFishboneSchema = CreateFishboneSchema.partial().openapi(
  "UpdateFishbone",
);

export type UpdateFishbone = z.infer<typeof UpdateFishboneSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListFishboneOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, description, and cause items)",
  }),
});

export type ListFishboneOptions = z.infer<typeof ListFishboneOptionsSchema>;

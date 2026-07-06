/**
 * ReflectionTemplate types — Zod schemas (single source), inferred types.
 * Pre-built prompt packs that seed reflection sessions.
 */

import { z } from "@hono/zod-openapi";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const ReflectionTemplateSchema = z.object({
  id: z.string().openapi({
    description: "Template ID",
    example: "rtemplate_weekly_review",
  }),
  name: z.string().openapi({
    description: "Template name",
    example: "Weekly Review",
  }),
  description: z.string().nullable().optional().openapi({
    description: "What this template is for",
    example: "Structured prompts for a weekly reflection session.",
  }),
  period: z.string().nullable().optional().openapi({
    description:
      "Suggested reflection period (weekly, monthly, quarterly, annual)",
    example: "weekly",
  }),
  categories: z.array(z.string()).nullable().optional().openapi({
    description: "Category tags (e.g. Career, Health, Goals)",
    example: ["Career", "Weekly"],
  }),
  prompts: z.array(z.string()).openapi({
    description: "Ordered list of reflection prompts",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi(
  "ReflectionTemplate",
);

export type ReflectionTemplate = z.infer<typeof ReflectionTemplateSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateReflectionTemplateSchema = ReflectionTemplateSchema.pick({
  name: true,
  description: true,
  period: true,
  categories: true,
  prompts: true,
}).partial({
  description: true,
  period: true,
  categories: true,
  prompts: true,
}).openapi("CreateReflectionTemplate");

export type CreateReflectionTemplate = z.infer<
  typeof CreateReflectionTemplateSchema
>;

export const UpdateReflectionTemplateSchema = CreateReflectionTemplateSchema
  .partial().openapi("UpdateReflectionTemplate");

export type UpdateReflectionTemplate = z.infer<
  typeof UpdateReflectionTemplateSchema
>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListReflectionTemplateOptionsSchema = z.object({
  category: z.string().optional().openapi({
    param: { name: "category", in: "query" },
    description: "Filter by category tag",
  }),
  period: z.string().optional().openapi({
    param: { name: "period", in: "query" },
    description: "Filter by suggested period",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name and prompts)",
  }),
});

export type ListReflectionTemplateOptions = z.infer<
  typeof ListReflectionTemplateOptionsSchema
>;

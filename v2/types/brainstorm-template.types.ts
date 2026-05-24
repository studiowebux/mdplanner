/**
 * BrainstormTemplate types — Zod schemas (single source), inferred types.
 * Pre-built question packs that seed brainstorm sessions.
 */

import { z } from "@hono/zod-openapi";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const BrainstormTemplateSchema = z.object({
  id: z.string().openapi({
    description: "Template ID",
    example: "btemplate_product_retro",
  }),
  name: z.string().openapi({
    description: "Template name",
    example: "Product Retrospective",
  }),
  description: z.string().nullable().optional().openapi({
    description: "What this template is for",
    example: "Structured questions for a product retrospective session.",
  }),
  categories: z.array(z.string()).nullable().optional().openapi({
    description: "Category tags (e.g. Product, Risk, Strategy)",
    example: ["Product", "Retrospective"],
  }),
  questions: z.array(z.string()).openapi({
    description: "Ordered list of guiding questions",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi(
  "BrainstormTemplate",
);

export type BrainstormTemplate = z.infer<typeof BrainstormTemplateSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateBrainstormTemplateSchema = BrainstormTemplateSchema.pick({
  name: true,
  description: true,
  categories: true,
  questions: true,
}).partial({
  description: true,
  categories: true,
  questions: true,
}).openapi("CreateBrainstormTemplate");

export type CreateBrainstormTemplate = z.infer<
  typeof CreateBrainstormTemplateSchema
>;

export const UpdateBrainstormTemplateSchema = CreateBrainstormTemplateSchema
  .partial().openapi("UpdateBrainstormTemplate");

export type UpdateBrainstormTemplate = z.infer<
  typeof UpdateBrainstormTemplateSchema
>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListBrainstormTemplateOptionsSchema = z.object({
  category: z.string().optional().openapi({
    param: { name: "category", in: "query" },
    description: "Filter by category tag",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name and questions)",
  }),
});

export type ListBrainstormTemplateOptions = z.infer<
  typeof ListBrainstormTemplateOptionsSchema
>;

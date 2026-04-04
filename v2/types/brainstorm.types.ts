/**
 * Brainstorm types — Zod schemas (single source), inferred types.
 * Q&A sessions: structured question-answer pairs with cross-entity links.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const BrainstormQuestionSchema = z.object({
  question: z.string().openapi({
    description: "Question prompt",
    example: "What are our top priorities?",
  }),
  answer: z.string().nullable().optional().openapi({
    description: "Answer text (markdown)",
    example: "Focus on billing and CRM modules.",
  }),
}).openapi("BrainstormQuestion");

export type BrainstormQuestion = z.infer<typeof BrainstormQuestionSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const BrainstormSchema = z.object({
  id: z.string().openapi({
    description: "Brainstorm ID",
    example: "brainstorm_roadmap",
  }),
  title: z.string().openapi({
    description: "Brainstorm title",
    example: "Product Roadmap Q2 2026",
  }),
  tags: z.array(z.string()).nullable().optional().openapi({
    description: "Tags for filtering",
  }),
  linkedProjects: z.array(z.string()).nullable().optional().openapi({
    description: "Linked project names",
  }),
  linkedTasks: z.array(z.string()).nullable().optional().openapi({
    description: "Linked task IDs",
  }),
  linkedGoals: z.array(z.string()).nullable().optional().openapi({
    description: "Linked goal IDs",
  }),
  questions: z.array(BrainstormQuestionSchema).openapi({
    description: "Ordered Q&A pairs",
  }),
}).merge(AuditFieldsSchema).openapi("Brainstorm");

export type Brainstorm = z.infer<typeof BrainstormSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from BrainstormSchema
// ---------------------------------------------------------------------------

export const CreateBrainstormSchema = BrainstormSchema.pick({
  title: true,
  tags: true,
  linkedProjects: true,
  linkedTasks: true,
  linkedGoals: true,
  questions: true,
}).partial({
  tags: true,
  linkedProjects: true,
  linkedTasks: true,
  linkedGoals: true,
  questions: true,
}).openapi("CreateBrainstorm");

export type CreateBrainstorm = z.infer<typeof CreateBrainstormSchema>;

export const UpdateBrainstormSchema = CreateBrainstormSchema.partial().openapi(
  "UpdateBrainstorm",
);

export type UpdateBrainstorm = z.infer<typeof UpdateBrainstormSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListBrainstormOptionsSchema = z.object({
  tag: z.string().optional().openapi({
    param: { name: "tag", in: "query" },
    description: "Filter by tag",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and questions)",
  }),
});

export type ListBrainstormOptions = z.infer<typeof ListBrainstormOptionsSchema>;

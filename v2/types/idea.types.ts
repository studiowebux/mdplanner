/**
 * Idea types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IDEA_STATUSES = [
  "new",
  "considering",
  "planned",
  "approved",
  "rejected",
  "implemented",
  "cancelled",
] as const;

export const IDEA_PRIORITIES = ["high", "medium", "low"] as const;

export const IDEA_COMPLETED_STATUSES = new Set([
  "implemented",
  "cancelled",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const IdeaSchema = z.object({
  id: z.string().openapi({ description: "Idea ID", example: "idea_ai" }),
  title: z.string().openapi({
    description: "Idea title",
    example: "AI Task Assistant",
  }),
  status: z.enum(IDEA_STATUSES).openapi({
    description: "Idea status",
    example: "new",
  }),
  category: z.string().optional().openapi({
    description: "Idea category (e.g. feature, enhancement, research)",
    example: "feature",
  }),
  priority: z.enum(IDEA_PRIORITIES).optional().openapi({
    description: "Priority level",
    example: "high",
  }),
  project: z.string().optional().openapi({
    description: "Linked project name",
  }),
  startDate: z.string().optional().openapi({
    description: "Planned start date (YYYY-MM-DD)",
    example: "2026-04-01",
  }),
  endDate: z.string().optional().openapi({
    description: "Planned end date (YYYY-MM-DD)",
    example: "2026-06-30",
  }),
  resources: z.string().optional().openapi({
    description: "Resource requirements (free-text)",
    example: "2 devs, API budget",
  }),
  subtasks: z.array(z.string()).optional().openapi({
    description: "Subtask descriptions",
  }),
  description: z.string().optional().openapi({
    description: "Idea description (markdown)",
  }),
  links: z.array(z.string()).optional().openapi({
    description: "Linked idea IDs (Zettelkasten-style)",
  }),
  implementedAt: z.string().optional().openapi({
    description: "ISO timestamp when status changed to implemented",
  }),
  cancelledAt: z.string().optional().openapi({
    description: "ISO timestamp when status changed to cancelled",
  }),
  created: z.string().openapi({ description: "ISO creation timestamp" }),
  updated: z.string().openapi({ description: "ISO last-updated timestamp" }),
}).openapi("Idea");

export type Idea = z.infer<typeof IdeaSchema>;

export type IdeaWithBacklinks = Idea & { backlinks: string[] };

// ---------------------------------------------------------------------------
// Create / Update — derived from IdeaSchema
// ---------------------------------------------------------------------------

export const CreateIdeaSchema = IdeaSchema.pick({
  title: true,
  status: true,
  category: true,
  priority: true,
  project: true,
  startDate: true,
  endDate: true,
  resources: true,
  subtasks: true,
  description: true,
  links: true,
}).partial({
  status: true,
}).openapi("CreateIdea");

export type CreateIdea = z.infer<typeof CreateIdeaSchema>;

export const UpdateIdeaSchema = CreateIdeaSchema.partial().openapi(
  "UpdateIdea",
);

export type UpdateIdea = z.infer<typeof UpdateIdeaSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListIdeaOptionsSchema = z.object({
  status: z.enum(IDEA_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
  }),
  category: z.string().optional().openapi({
    param: { name: "category", in: "query" },
  }),
  priority: z.enum(IDEA_PRIORITIES).optional().openapi({
    param: { name: "priority", in: "query" },
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and description)",
  }),
});

export type ListIdeaOptions = z.infer<typeof ListIdeaOptionsSchema>;

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Status enum — shared across all milestone schemas
// ---------------------------------------------------------------------------

export const MILESTONE_STATUSES = ["open", "completed"] as const;

// ---------------------------------------------------------------------------
// Base — raw milestone as stored on disk (parser output)
// ---------------------------------------------------------------------------

export const MilestoneBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(MILESTONE_STATUSES),
  target: z.string().optional(),
  description: z.string().optional(),
  project: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export type MilestoneBase = z.infer<typeof MilestoneBaseSchema>;

// ---------------------------------------------------------------------------
// Enriched — base + computed fields (service output, API response)
// ---------------------------------------------------------------------------

export const MilestoneSchema = MilestoneBaseSchema.extend({
  descriptionHtml: z.string().optional(),
  taskCount: z.number(),
  completedCount: z.number(),
  progress: z.number().min(0).max(100),
}).openapi("Milestone");

export type Milestone = z.infer<typeof MilestoneSchema>;

// ---------------------------------------------------------------------------
// Create — input for POST
// ---------------------------------------------------------------------------

export const CreateMilestoneSchema = z.object({
  name: z.string().min(1).openapi({ description: "Milestone name" }),
  target: z.string().optional().openapi({
    description: "Target date (YYYY-MM-DD)",
  }),
  status: z.enum(MILESTONE_STATUSES).default("open").openapi({
    description: "Milestone status",
  }),
  description: z.string().optional().openapi({
    description: "Optional description",
  }),
  project: z.string().optional().openapi({
    description: "Project filter scope",
  }),
}).openapi("CreateMilestone");

export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>;

// ---------------------------------------------------------------------------
// Update — input for PUT (all fields optional)
// ---------------------------------------------------------------------------

export const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).optional().openapi({
    description: "Milestone name",
  }),
  target: z.string().nullable().optional().openapi({
    description: "Target date (YYYY-MM-DD)",
  }),
  status: z.enum(MILESTONE_STATUSES).optional().openapi({
    description: "Milestone status",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Optional description",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Project filter scope",
  }),
}).openapi("UpdateMilestone");

export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>;

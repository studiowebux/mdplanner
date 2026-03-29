/**
 * Goal types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GOAL_STATUSES = [
  "planning",
  "on-track",
  "at-risk",
  "late",
  "success",
  "failed",
] as const;

export const GOAL_TYPES = ["enterprise", "project"] as const;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const GoalSchema = z.object({
  id: z.string().openapi({ description: "Goal ID", example: "goal_mvp" }),
  title: z.string().openapi({
    description: "Goal title",
    example: "Launch MVP",
  }),
  description: z.string().openapi({
    description: "Goal description (markdown)",
  }),
  type: z.enum(GOAL_TYPES).openapi({
    description: "Goal type",
    example: "project",
  }),
  kpi: z.string().openapi({
    description: "Human-readable KPI target",
    example: "$50k MRR",
  }),
  kpiMetric: z.string().nullable().optional().openapi({
    description:
      "KPI snapshot metric field name (e.g. mrr, active_users, growth_rate)",
  }),
  kpiTarget: z.number().nullable().optional().openapi({
    description: "Numeric target value for the KPI metric",
  }),
  kpiValue: z.number().nullable().optional().openapi({
    description: "Current actual value for the KPI metric",
  }),
  startDate: z.string().openapi({
    description: "Start date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  endDate: z.string().openapi({
    description: "End date (YYYY-MM-DD)",
    example: "2026-12-31",
  }),
  status: z.enum(GOAL_STATUSES).openapi({
    description: "Goal status",
    example: "on-track",
  }),
  githubRepo: z.string().nullable().optional().openapi({
    description: "Linked GitHub repository (owner/repo)",
  }),
  githubMilestone: z.number().nullable().optional().openapi({
    description: "Linked GitHub milestone number",
  }),
  linkedPortfolioItems: z.array(z.string()).nullable().optional().openapi({
    description: "Linked portfolio item IDs",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  owner: z.string().nullable().optional().openapi({
    description: "Goal owner (person name)",
  }),
  contributors: z.array(z.string()).nullable().optional().openapi({
    description: "Contributing people (names)",
  }),
  priority: z.number().min(1).max(5).nullable().optional().openapi({
    description: "Priority 1 (highest) to 5 (lowest)",
  }),
  progress: z.number().min(0).max(100).nullable().optional().openapi({
    description: "Manual progress percentage (0-100)",
  }),
  parentGoal: z.string().nullable().optional().openapi({
    description: "Parent goal ID (for OKR hierarchy)",
  }),
  linkedMilestones: z.array(z.string()).nullable().optional().openapi({
    description: "Linked milestone IDs",
  }),
  tags: z.array(z.string()).nullable().optional().openapi({
    description: "Goal labels/tags",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
  createdAt: z.string().openapi({ description: "ISO creation timestamp" }),
  updatedAt: z.string().openapi({ description: "ISO last-updated timestamp" }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
}).openapi("Goal");

export type Goal = z.infer<typeof GoalSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from GoalSchema
// ---------------------------------------------------------------------------

export const CreateGoalSchema = GoalSchema.pick({
  title: true,
  description: true,
  type: true,
  kpi: true,
  kpiMetric: true,
  kpiTarget: true,
  kpiValue: true,
  startDate: true,
  endDate: true,
  status: true,
  githubRepo: true,
  githubMilestone: true,
  linkedPortfolioItems: true,
  project: true,
  owner: true,
  contributors: true,
  priority: true,
  progress: true,
  parentGoal: true,
  linkedMilestones: true,
  tags: true,
  notes: true,
}).partial({
  description: true,
  kpi: true,
  startDate: true,
  endDate: true,
  status: true,
}).openapi("CreateGoal");

export type CreateGoal = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = CreateGoalSchema.partial().openapi(
  "UpdateGoal",
);

export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListGoalOptionsSchema = z.object({
  status: z.enum(GOAL_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
  }),
  type: z.enum(GOAL_TYPES).optional().openapi({
    param: { name: "type", in: "query" },
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
  }),
});

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Status enum — shared across all milestone schemas
// ---------------------------------------------------------------------------

export const MILESTONE_STATUSES = ["open", "completed"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Label map for UI selects and filters — derived from MILESTONE_STATUSES. */
export const MILESTONE_STATUS_OPTIONS = MILESTONE_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

// ---------------------------------------------------------------------------
// Base — raw milestone as stored on disk (parser output)
// ---------------------------------------------------------------------------

export const MilestoneBaseSchema = z.object({
  id: z.string().openapi({
    description: "Unique milestone identifier",
    example: "milestone_1773631350959_ohutdh",
  }),
  name: z.string().openapi({
    description: "Milestone display name",
    example: "v2.0.0",
  }),
  status: z.enum(MILESTONE_STATUSES).openapi({
    description: "Milestone lifecycle status",
    example: "open",
  }),
  target: z.string().nullable().optional().openapi({
    description: "Target completion date (YYYY-MM-DD)",
    example: "2026-06-01",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Milestone description (markdown)",
    example: "Full v2 clean architecture rewrite.",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Project this milestone belongs to",
    example: "MD Planner",
  }),
  completedAt: z.string().nullable().optional().openapi({
    description: "ISO date when milestone was marked completed",
    example: "2026-05-15",
  }),
  createdAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp of creation",
    example: "2026-03-16T03:22:47.963Z",
  }),
  updatedAt: z.string().nullable().optional().openapi({
    description: "ISO timestamp of last update",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
});

export type MilestoneBase = z.infer<typeof MilestoneBaseSchema>;

// ---------------------------------------------------------------------------
// Enriched — base + computed fields (service output, API response)
// ---------------------------------------------------------------------------

export const MilestoneSchema = MilestoneBaseSchema.extend({
  descriptionHtml: z.string().optional().openapi({
    description: "Description rendered as HTML",
  }),
  taskCount: z.number().openapi({
    description: "Total tasks linked to this milestone",
    example: 12,
  }),
  completedCount: z.number().openapi({
    description: "Number of completed tasks",
    example: 5,
  }),
  progress: z.number().min(0).max(100).openapi({
    description: "Completion percentage (0-100)",
    example: 42,
  }),
}).openapi("Milestone");

export type Milestone = z.infer<typeof MilestoneSchema>;

// ---------------------------------------------------------------------------
// Create — derived from MilestoneBaseSchema, name required with min(1)
// ---------------------------------------------------------------------------

export const CreateMilestoneSchema = MilestoneBaseSchema
  .omit({ id: true, completedAt: true, createdAt: true })
  .extend({
    name: z.string().min(1).openapi({
      description: "Milestone display name",
      example: "v2.1.0",
    }),
    status: z.enum(MILESTONE_STATUSES).default("open").openapi({
      description: "Milestone status",
      example: "open",
    }),
    description: z.string().nullable().optional().openapi({
      description:
        "What this milestone delivers (markdown). Use headings and lists for structure.",
      example:
        "Search improvements and performance tuning.\n\n## Deliverables\n\n- FTS5 index rebuild on schema change\n- Sub-200ms search for 10k entities\n- Search result highlighting",
    }),
  })
  .openapi("CreateMilestone");

export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>;

// ---------------------------------------------------------------------------
// Update — all Create fields optional
// ---------------------------------------------------------------------------

export const UpdateMilestoneSchema = CreateMilestoneSchema
  .partial()
  .openapi("UpdateMilestone");

export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>;

// ---------------------------------------------------------------------------
// List filter — shared by MCP, REST, and SSR consumers
// ---------------------------------------------------------------------------

export const ListMilestoneOptionsSchema = z.object({
  status: z.enum(MILESTONE_STATUSES).optional().openapi({
    description: "Filter by milestone status",
    example: "open",
  }),
  project: z.string().optional().openapi({
    description:
      "Filter by project name (case-insensitive match on milestone.project)",
    example: "MD Planner",
  }),
}).openapi("ListMilestoneOptions");

// ---------------------------------------------------------------------------
// Summary query — input for get_milestone_summary (MCP) and future REST
// ---------------------------------------------------------------------------

export const MilestoneSummaryQuerySchema = z.object({
  milestone: z.string().openapi({
    description: "Milestone name to summarize (exact match)",
    example: "v2.0.0",
  }),
  project: z.string().optional().openapi({
    description:
      "Filter tasks within the milestone by project name (case-insensitive)",
    example: "MD Planner",
  }),
}).openapi("MilestoneSummaryQuery");

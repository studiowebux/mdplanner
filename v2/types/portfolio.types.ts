import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Status enum — shared across all portfolio schemas
// ---------------------------------------------------------------------------

export const PORTFOLIO_STATUSES = [
  "active",
  "completed",
  "on-hold",
  "planning",
  "production",
  "maintenance",
  "paused",
  "archived",
  "cancelled",
] as const;

export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];

export const PORTFOLIO_STATUS_OPTIONS = PORTFOLIO_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1).replace("-", " "),
}));

export const PortfolioKpiSchema = z.object({
  name: z.string().openapi({
    description: "KPI metric name",
    example: "Monthly Active Users",
  }),
  value: z.union([z.string(), z.number()]).openapi({
    description: "Current KPI value",
    example: 1250,
  }),
  target: z.union([z.string(), z.number()]).nullable().optional().openapi({
    description: "Target KPI value",
    example: 2000,
  }),
  unit: z.string().nullable().optional().openapi({
    description: "Unit of measurement",
    example: "users",
  }),
}).openapi("PortfolioKpi");

export const PortfolioUrlSchema = z.object({
  label: z.string().openapi({
    description: "Link display text",
    example: "GitHub",
  }),
  href: z.string().openapi({
    description: "Link URL",
    example: "https://github.com/studiowebux/mdplanner",
  }),
}).openapi("PortfolioUrl");

export const PortfolioStatusUpdateSchema = z.object({
  id: z.string().openapi({
    description: "Status update identifier",
    example: "update_1773600000000_abc1",
  }),
  date: z.string().openapi({
    description: "Update date (ISO or YYYY-MM-DD)",
    example: "2026-03-15",
  }),
  message: z.string().openapi({
    description: "Status update message (markdown)",
    example: "Completed sprint 4. On track for Q2 release.",
  }),
}).openapi("PortfolioStatusUpdate");

export const PortfolioItemSchema = z.object({
  id: z.string().openapi({
    description: "Unique portfolio item identifier",
    example: "portfolio_1773600000000_xyz1",
  }),
  name: z.string().openapi({
    description: "Project or product name",
    example: "MDPlanner",
  }),
  category: z.string().openapi({
    description: "Portfolio category for grouping",
    example: "SaaS Products",
  }),
  status: z.enum(PORTFOLIO_STATUSES).openapi({
    description: "Current project status",
    example: "active",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Project description (markdown)",
    example: "A modern project management platform for agile teams.",
  }),
  client: z.string().nullable().optional().openapi({
    description: "Client or stakeholder name",
    example: "Internal",
  }),
  revenue: z.number().nullable().optional().openapi({
    description: "Total revenue in base currency",
    example: 125000,
  }),
  expenses: z.number().nullable().optional().openapi({
    description: "Total expenses in base currency",
    example: 45000,
  }),
  progress: z.number().nullable().optional().openapi({
    description: "Overall completion percentage (0-100)",
    example: 65,
  }),
  startDate: z.string().nullable().optional().openapi({
    description: "Project start date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  endDate: z.string().nullable().optional().openapi({
    description: "Project end or target date (YYYY-MM-DD)",
    example: "2026-12-31",
  }),
  team: z.array(z.string()).nullable().optional().openapi({
    description: "Team member names or person IDs",
    example: ["alice", "bob"],
  }),
  techStack: z.array(z.string()).nullable().optional().openapi({
    description: "Technologies used in this project",
    example: ["Deno", "Hono", "SQLite"],
  }),
  logo: z.string().nullable().optional().openapi({
    description: "Path or URL to project logo image",
  }),
  license: z.string().nullable().optional().openapi({
    description: "Software license identifier",
    example: "MIT",
  }),
  githubRepo: z.string().nullable().optional().openapi({
    description: "GitHub repository (owner/repo)",
    example: "studiowebux/mdplanner",
  }),
  billingCustomerId: z.string().nullable().optional().openapi({
    description: "External billing system customer ID",
  }),
  brainManaged: z.boolean().optional().openapi({
    description: "Whether this project is managed by a Cerveau brain",
    example: true,
  }),
  linkedGoals: z.array(z.string()).nullable().optional().openapi({
    description: "Goal IDs linked to this portfolio item",
  }),
  kpis: z.array(PortfolioKpiSchema).nullable().optional().openapi({
    description: "Key performance indicators tracked for this project",
  }),
  urls: z.array(PortfolioUrlSchema).nullable().optional().openapi({
    description: "External links (docs, repo, demo, etc.)",
  }),
  statusUpdates: z.array(PortfolioStatusUpdateSchema).nullable().optional()
    .openapi({
      description: "Chronological status updates",
    }),
  createdAt: z.string().nullable().optional().openapi({
    description: "ISO creation timestamp",
  }),
  updatedAt: z.string().nullable().optional().openapi({
    description: "ISO last-updated timestamp",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
}).openapi("PortfolioItem");

export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
export type PortfolioKpi = z.infer<typeof PortfolioKpiSchema>;
export type PortfolioUrl = z.infer<typeof PortfolioUrlSchema>;
export type PortfolioStatusUpdate = z.infer<typeof PortfolioStatusUpdateSchema>;

export const PortfolioSummarySchema = z.object({
  total: z.number().openapi({
    description: "Total number of portfolio items",
    example: 8,
  }),
  byStatus: z.record(z.number()).openapi({
    description: "Count of items per status",
    example: { active: 5, completed: 2, paused: 1 },
  }),
  byCategory: z.record(z.number()).openapi({
    description: "Count of items per category",
    example: { "SaaS Products": 3, "Open Source": 5 },
  }),
  avgProgress: z.number().openapi({
    description: "Average completion percentage across all items",
    example: 54,
  }),
  totalRevenue: z.number().openapi({
    description: "Sum of revenue across all items",
    example: 350000,
  }),
  totalExpenses: z.number().openapi({
    description: "Sum of expenses across all items",
    example: 120000,
  }),
}).openapi("PortfolioSummary");

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

// ---------------------------------------------------------------------------
// Create — derived from PortfolioItemSchema, name required, rest optional
// ---------------------------------------------------------------------------

export const CreatePortfolioItemSchema = PortfolioItemSchema
  .omit({ id: true, statusUpdates: true })
  .extend({
    name: z.string().min(1).openapi({
      description: "Project or product name",
      example: "MDPlanner",
    }),
    category: z.string().optional().openapi({
      description: "Portfolio category for grouping",
      example: "SaaS Products",
    }),
    status: z.enum(PORTFOLIO_STATUSES).optional().openapi({
      description: "Current project status",
      example: "active",
    }),
  })
  .openapi("CreatePortfolioItem");

export type CreatePortfolioItem = z.infer<typeof CreatePortfolioItemSchema>;

// ---------------------------------------------------------------------------
// Update — all Create fields optional
// ---------------------------------------------------------------------------

export const UpdatePortfolioItemSchema = CreatePortfolioItemSchema
  .partial()
  .openapi("UpdatePortfolioItem");

export type UpdatePortfolioItem = z.infer<typeof UpdatePortfolioItemSchema>;

// ---------------------------------------------------------------------------
// Status update — input for POST /:id/status-updates
// ---------------------------------------------------------------------------

export const AddStatusUpdateSchema = z.object({
  message: z.string().min(1).openapi({
    description: "Status update message (markdown)",
    example: "Completed sprint 4. On track for Q2 release.",
  }),
}).openapi("AddPortfolioStatusUpdate");

// ---------------------------------------------------------------------------
// Dashboard — per-project health for the portfolio overview
// ---------------------------------------------------------------------------

export const DashboardTaskCountsSchema = z.record(z.number()).openapi({
  description:
    "Task counts keyed by section abbreviation (first letter of each word, e.g. B=Backlog, T=Todo, IP=In Progress)",
  example: { B: 5, T: 3, IP: 2, PR: 1, D: 10 },
});

export const DashboardMilestoneSchema = z.object({
  name: z.string(),
  completionPct: z.number(),
}).nullable().openapi("DashboardMilestone");

export const DashboardGitHubSchema = z.object({
  lastCommitDate: z.string().nullable(),
  openPrs: z.number(),
  openIssues: z.number(),
  ciSuccessRate: z.number().nullable(),
}).nullable().openapi("DashboardGitHub");

export const PortfolioDashboardItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(PORTFOLIO_STATUSES),
  category: z.string(),
  githubRepo: z.string().nullable().optional(),
  tasks: DashboardTaskCountsSchema,
  lastActivity: z.string().nullable(),
  milestone: DashboardMilestoneSchema,
  github: DashboardGitHubSchema,
}).openapi("PortfolioDashboardItem");

export type PortfolioDashboardItem = z.infer<
  typeof PortfolioDashboardItemSchema
>;

export const PortfolioDashboardSchema = z.array(PortfolioDashboardItemSchema)
  .openapi("PortfolioDashboard");

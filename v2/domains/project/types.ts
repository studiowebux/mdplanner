// Project configuration types — sourced from project.md frontmatter.

import { z } from "@hono/zod-openapi";
import { WEEKDAYS } from "../../constants/mod.ts";
import { decryptSecret } from "../../utils/secrets.ts";

export const ProjectLinkSchema = z.object({
  title: z.string().openapi({
    description: "Link display text",
    example: "Repository",
  }),
  url: z.string().openapi({
    description: "Link URL",
    example: "https://github.com/studiowebux/mdplanner",
  }),
}).openapi("ProjectLink");

export type ProjectLink = z.infer<typeof ProjectLinkSchema>;

export const ProjectConfigSchema = z.object({
  name: z.string().openapi({
    description: "Project display name",
    example: "MDPlanner",
  }),
  description: z.string().optional().openapi({
    description: "Project description (markdown body from project.md)",
    example: "A modern project management platform for agile teams.",
  }),
  startDate: z.string().optional().openapi({
    description: "Project start date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  workingDaysPerWeek: z.number().optional().openapi({
    description: "Number of working days per week for capacity planning",
    example: 5,
  }),
  workingDays: z.array(z.enum(WEEKDAYS)).optional().openapi({
    description: "Working day names for scheduling",
    example: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "Available task tags for this project",
    example: ["feature", "bug", "enhancement", "docs"],
  }),
  links: z.array(ProjectLinkSchema).optional().openapi({
    description: "External links (repo, docs, Discord, etc.)",
  }),
  features: z.array(z.string()).optional().openapi({
    description:
      "Enabled feature/domain keys — controls which views appear in the sidebar",
    example: ["milestones", "tasks", "notes", "goals"],
  }),
  navCategories: z.record(z.array(z.string())).optional().openapi({
    description:
      "Sidebar navigation categories. Keys are category names, values are arrays of entity keys. " +
      "Uncategorized enabled features go to 'Other'. When absent, built-in defaults are used.",
    example: {
      Work: ["task", "milestone", "goal"],
      Notes: ["note", "journal", "habit"],
    },
  }),
  port: z.number().optional().openapi({
    description:
      "HTTP server port. Overridden by PORT env var. Defaults to 8003.",
    example: 8003,
  }),
  sectionOrder: z.array(z.string()).optional().openapi({
    description:
      "Display order for task board sections. Sections not listed appear at the end. " +
      "Defaults to: Backlog, Todo, In Progress, Pending Review, Done.",
    example: ["Backlog", "Todo", "In Progress", "Pending Review", "Done"],
  }),
  locale: z.string().optional().openapi({
    description: "BCP 47 locale for date/number formatting. Defaults to en-US.",
    example: "en-US",
  }),
  currency: z.string().optional().openapi({
    description:
      "ISO 4217 currency code for money formatting. Defaults to USD.",
    example: "USD",
  }),
  lastUpdated: z.string().optional().openapi({
    description: "ISO timestamp of last project.md write",
    example: "2026-03-17T19:00:00.000Z",
  }),
  githubToken: z.string().optional().openapi({
    description: "GitHub Personal Access Token (stored in project.md)",
    example: "ghp_...",
  }),
  pipelinesPerPage: z.number().optional().openapi({
    description: "Number of pipeline runs per page (default: 10)",
    example: 10,
  }),
}).openapi("ProjectConfig");

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const UpdateProjectConfigSchema = z.object({
  name: z.string().optional().openapi({
    description: "Project display name",
    example: "MDPlanner",
  }),
  description: z.string().optional().openapi({
    description: "Project description (markdown)",
  }),
  startDate: z.string().optional().openapi({
    description: "Project start date (YYYY-MM-DD). Omit to leave unchanged.",
    example: "2026-01-01",
  }),
  workingDaysPerWeek: z.number().optional().openapi({
    description: "Number of working days per week. Omit to leave unchanged.",
    example: 5,
  }),
  workingDays: z.array(z.enum(WEEKDAYS)).optional().openapi({
    description: "Working day names. Omit to leave unchanged.",
    example: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "Available task tags. Omit to leave unchanged.",
    example: ["feature", "bug", "enhancement"],
  }),
  links: z.array(ProjectLinkSchema).optional().openapi({
    description: "External links. Omit to leave unchanged.",
  }),
  features: z.array(z.string()).optional().openapi({
    description:
      "Enabled feature keys — replaces the full list. Omit to leave unchanged.",
    example: ["milestones", "tasks", "notes"],
  }),
  navCategories: z.record(z.array(z.string())).optional().openapi({
    description: "Sidebar navigation categories. Omit to leave unchanged.",
  }),
  port: z.number().optional().openapi({
    description: "HTTP server port. Omit to leave unchanged.",
    example: 8003,
  }),
  sectionOrder: z.array(z.string()).optional().openapi({
    description: "Section display order. Omit to leave unchanged.",
  }),
  locale: z.string().optional().openapi({
    description: "BCP 47 locale. Omit to leave unchanged.",
    example: "en-US",
  }),
  currency: z.string().optional().openapi({
    description: "ISO 4217 currency code. Omit to leave unchanged.",
    example: "USD",
  }),
  githubToken: z.string().optional().openapi({
    description: "GitHub Personal Access Token. Omit to leave unchanged.",
    example: "ghp_...",
  }),
  pipelinesPerPage: z.number().optional().openapi({
    description: "Pipelines per page. Omit to leave unchanged.",
    example: 10,
  }),
}).openapi("UpdateProjectConfig");

export type UpdateProjectConfig = z.infer<typeof UpdateProjectConfigSchema>;

// ---------------------------------------------------------------------------
// Features list — used by GET/PUT /features endpoints
// ---------------------------------------------------------------------------

export const FeaturesListSchema = z.array(z.string()).openapi(
  "FeaturesList",
);

// ---------------------------------------------------------------------------
// FrontmatterProjectSchema — internal
// Maps raw project.md frontmatter (snake_case) → ProjectConfig (camelCase).
// Used only by ProjectRepository. Not registered in OpenAPI.
// ---------------------------------------------------------------------------

function parseFrontmatterNavCategories(
  raw: unknown,
): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) result[key] = val.map(String);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export const FrontmatterProjectSchema = z.object({
  start_date: z.string().optional(),
  working_days_per_week: z.number().optional(),
  working_days: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
  links: z.array(z.unknown()).optional(),
  features: z.array(z.unknown()).optional(),
  nav_categories: z.unknown().optional(),
  port: z.number().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
  section_order: z.array(z.unknown()).optional(),
  github_token: z.string().optional(),
  pipelines_per_page: z.number().optional(),
  last_updated: z.string().optional(),
}).transform(async (fm): Promise<Omit<ProjectConfig, "name" | "description">> => {
  const githubToken = fm.github_token
    ? (await decryptSecret(fm.github_token) ?? undefined)
    : undefined;

  return {
    startDate: fm.start_date,
    workingDaysPerWeek: fm.working_days_per_week,
    workingDays: Array.isArray(fm.working_days)
      ? (fm.working_days as unknown[]).map(String).filter(
        (d): d is typeof WEEKDAYS[number] =>
          (WEEKDAYS as readonly string[]).includes(d),
      )
      : undefined,
    tags: Array.isArray(fm.tags)
      ? (fm.tags as unknown[]).map(String)
      : undefined,
    links: Array.isArray(fm.links)
      ? (fm.links as Record<string, unknown>[]).filter(
        (l) => typeof l.url === "string" && typeof l.title === "string",
      ) as ProjectLink[]
      : undefined,
    features: Array.isArray(fm.features)
      ? (fm.features as unknown[]).map(String)
      : undefined,
    navCategories: parseFrontmatterNavCategories(fm.nav_categories),
    port: fm.port,
    locale: fm.locale,
    currency: fm.currency,
    sectionOrder: Array.isArray(fm.section_order)
      ? (fm.section_order as unknown[]).map(String)
      : undefined,
    githubToken,
    pipelinesPerPage: fm.pipelines_per_page,
    lastUpdated: fm.last_updated,
  };
});

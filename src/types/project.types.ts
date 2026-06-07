// Project configuration types — sourced from project.md frontmatter.

import { z } from "@hono/zod-openapi";
import { WEEKDAYS } from "../constants/mod.ts";
import { stringArray } from "./shared.types.ts";
import { decryptSecret } from "../utils/secrets.ts";

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

export const ApiKeySchema = z.object({
  name: z.string().openapi({
    description: "Human-readable label for this key",
    example: "CI Bot",
  }),
  key: z.string().openapi({
    description: "Raw API key value (stored encrypted in project.md)",
    example: "sk-abc123",
  }),
}).openapi("ApiKey");

export type ApiKey = z.infer<typeof ApiKeySchema>;

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
  tags: stringArray.optional().openapi({
    description: "Available task tags for this project",
    example: ["feature", "bug", "enhancement", "docs"],
  }),
  links: z.array(ProjectLinkSchema).optional().openapi({
    description: "External links (repo, docs, Discord, etc.)",
  }),
  features: stringArray.optional().openapi({
    description:
      "Enabled feature/domain keys — controls which views appear in the sidebar",
    example: ["milestones", "tasks", "notes", "goals"],
  }),
  navCategories: z.record(stringArray).optional().openapi({
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
  sectionOrder: stringArray.optional().openapi({
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
  cloudflareToken: z.string().optional().openapi({
    description:
      "Cloudflare API Token for DNS sync (stored in project.md, encrypted at rest)",
  }),
  pipelinesPerPage: z.number().optional().openapi({
    description: "Number of pipeline runs per page (default: 10)",
    example: 10,
  }),
  tasksPerSection: z.number().optional().openapi({
    description:
      "Number of tasks rendered per section in the task list/board before a 'Load more' control appears (default: 25).",
    example: 25,
  }),
  kpiMetrics: stringArray.optional().openapi({
    description:
      "Configurable KPI metric keys shown in goal form (e.g. mrr, arr, active_users)",
    example: ["mrr", "arr", "churn_rate"],
  }),
  staleDays: z.number().optional().openapi({
    description:
      "Number of days without activity before a portfolio project is considered stale. Defaults to 14.",
    example: 14,
  }),
  hideCompletedAfterDays: z.number().optional().openapi({
    description:
      "Automatically hide Done tasks completed more than this many days ago. 0 = hide immediately. Unset = never hide.",
    example: 7,
  }),
  stableVersion: z.string().optional().openapi({
    description:
      "Last known stable/tested version deployed to production. Separate from the latest tagged version.",
    example: "v0.33.3",
  }),
  milestoneStatuses: stringArray.optional().openapi({
    description:
      "Configurable milestone status values shown in milestone form and filters (e.g. open, completed, archived)",
    example: ["open", "completed"],
  }),
  billingCompany: z.string().optional().openapi({
    description: "Company name shown on quotes and invoices",
    example: "Acme Corp",
  }),
  billingAddress: z.string().optional().openapi({
    description: "Company address shown on quotes and invoices (multiline)",
    example: "123 Main St\nMontréal, QC H1A 1A1",
  }),
  billingLogoUrl: z.string().optional().openapi({
    description: "Logo URL shown on quotes and invoices",
    example: "https://example.com/logo.png",
  }),
  billingDefaultFooter: z.string().optional().openapi({
    description:
      "Default footer text for quotes and invoices (overridden per-document)",
    example: "Thank you for your business.",
  }),
  apiKeys: z.array(ApiKeySchema).optional().openapi({
    description:
      "API keys for programmatic access (MCP, CI, CLI). Stored encrypted in project.md.",
    example: [{ name: "CI Bot", key: "sk-abc123" }],
  }),
  defaultUserId: z.string().optional().openapi({
    description:
      "Person ID treated as the owner of legacy data that pre-dates per-user " +
      "scoping (e.g. untagged habit completions). Also used as the writer for " +
      "automated tools that lack an explicit actor (MCP without an explicit " +
      "userId). When unset, the first person record by name is used.",
    example: "person_1771824811363_phhxpx",
  }),
}).openapi("ProjectConfig");

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const UpdateProjectConfigSchema = ProjectConfigSchema.partial().openapi(
  "UpdateProjectConfig",
);

export type UpdateProjectConfig = z.infer<typeof UpdateProjectConfigSchema>;

// ---------------------------------------------------------------------------
// Features list — used by GET/PUT /features endpoints
// ---------------------------------------------------------------------------

export const FeaturesListSchema = stringArray.openapi(
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
  cloudflare_token: z.string().optional(),
  pipelines_per_page: z.number().optional(),
  tasks_per_section: z.number().optional(),
  kpi_metrics: z.array(z.unknown()).optional(),
  stale_days: z.number().optional(),
  hide_completed_after_days: z.number().optional(),
  stable_version: z.string().optional(),
  milestone_statuses: z.array(z.unknown()).optional(),
  last_updated: z.string().optional(),
  billing_company: z.string().optional(),
  billing_address: z.string().optional(),
  billing_logo_url: z.string().optional(),
  billing_default_footer: z.string().optional(),
  api_keys: z.array(z.unknown()).optional(),
  default_user_id: z.string().optional(),
}).transform(
  async (fm): Promise<Omit<ProjectConfig, "name" | "description">> => {
    const githubToken = fm.github_token
      ? (await decryptSecret(fm.github_token) ?? undefined)
      : undefined;
    const cloudflareToken = fm.cloudflare_token
      ? (await decryptSecret(fm.cloudflare_token) ?? undefined)
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
        ? (fm.links as unknown[]).filter(
          (l): l is ProjectLink =>
            typeof l === "object" && l !== null &&
            typeof (l as Record<string, unknown>).url === "string" &&
            typeof (l as Record<string, unknown>).title === "string",
        )
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
      cloudflareToken,
      pipelinesPerPage: fm.pipelines_per_page,
      tasksPerSection: typeof fm.tasks_per_section === "number"
        ? fm.tasks_per_section
        : undefined,
      kpiMetrics: Array.isArray(fm.kpi_metrics)
        ? (fm.kpi_metrics as unknown[]).map(String)
        : undefined,
      staleDays: fm.stale_days,
      hideCompletedAfterDays: typeof fm.hide_completed_after_days === "number"
        ? fm.hide_completed_after_days
        : undefined,
      stableVersion: fm.stable_version,
      milestoneStatuses: Array.isArray(fm.milestone_statuses)
        ? (fm.milestone_statuses as unknown[]).map(String)
        : undefined,
      lastUpdated: fm.last_updated,
      billingCompany: fm.billing_company,
      billingAddress: fm.billing_address,
      billingLogoUrl: fm.billing_logo_url,
      billingDefaultFooter: fm.billing_default_footer,
      apiKeys: Array.isArray(fm.api_keys)
        ? await Promise.all(
          (fm.api_keys as { name?: unknown; key?: unknown }[])
            .filter((e) =>
              typeof e.name === "string" && typeof e.key === "string"
            )
            .map(async (e) => ({
              name: e.name as string,
              key: (await decryptSecret(e.key as string)) ?? (e.key as string),
            })),
        )
        : undefined,
      defaultUserId: fm.default_user_id,
    };
  },
);

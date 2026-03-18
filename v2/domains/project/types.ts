// Project configuration types — sourced from project.md frontmatter.

import { z } from "@hono/zod-openapi";
import { WEEKDAYS } from "../../constants/mod.ts";

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
  lastUpdated: z.string().optional().openapi({
    description: "ISO timestamp of last project.md write",
    example: "2026-03-17T19:00:00.000Z",
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
}).openapi("UpdateProjectConfig");

export type UpdateProjectConfig = z.infer<typeof UpdateProjectConfigSchema>;

// ---------------------------------------------------------------------------
// Features list — used by GET/PUT /features endpoints
// ---------------------------------------------------------------------------

export const FeaturesListSchema = z.array(z.string()).openapi(
  "FeaturesList",
);

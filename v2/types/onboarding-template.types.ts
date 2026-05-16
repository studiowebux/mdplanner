/**
 * OnboardingTemplate types — Zod schemas (single source), inferred types.
 * Reusable step sets that seed onboarding records for a given role.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";
import { ONBOARDING_STEP_CATEGORIES } from "./onboarding.types.ts";

// ---------------------------------------------------------------------------
// Template step — title + category only (no status; that lives on the record)
// ---------------------------------------------------------------------------

export const OnboardingTemplateStepSchema = z.object({
  title: z.string().openapi({
    description: "Step title",
    example: "Laptop & equipment setup",
  }),
  category: z.enum(ONBOARDING_STEP_CATEGORIES).openapi({
    description: "Step category",
    example: "equipment",
  }),
}).openapi("OnboardingTemplateStep");

export type OnboardingTemplateStep = z.infer<
  typeof OnboardingTemplateStepSchema
>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const OnboardingTemplateSchema = z.object({
  id: z.string().openapi({
    description: "Template ID",
    example: "onboarding_template_1708600000000_exmpl",
  }),
  name: z.string().openapi({
    description: "Template name",
    example: "Software Engineer Onboarding",
  }),
  description: z.string().nullable().optional().openapi({
    description: "What this template is designed for",
    example: "Standard onboarding checklist for engineering hires.",
  }),
  role: z.string().nullable().optional().openapi({
    description: "Suggested role this template targets",
    example: "Software Engineer",
  }),
  tags: z.array(z.string()).nullable().optional().openapi({
    description: "Category tags",
    example: ["engineering", "remote"],
  }),
  steps: z.array(OnboardingTemplateStepSchema).openapi({
    description: "Ordered list of template steps",
  }),
}).merge(AuditFieldsSchema).openapi("OnboardingTemplate");

export type OnboardingTemplate = z.infer<typeof OnboardingTemplateSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateOnboardingTemplateSchema = OnboardingTemplateSchema.pick({
  name: true,
  description: true,
  role: true,
  tags: true,
  steps: true,
}).partial({
  description: true,
  role: true,
  tags: true,
  steps: true,
}).openapi("CreateOnboardingTemplate");

export type CreateOnboardingTemplate = z.infer<
  typeof CreateOnboardingTemplateSchema
>;

export const UpdateOnboardingTemplateSchema = CreateOnboardingTemplateSchema
  .partial().openapi("UpdateOnboardingTemplate");

export type UpdateOnboardingTemplate = z.infer<
  typeof UpdateOnboardingTemplateSchema
>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListOnboardingTemplateOptionsSchema = z.object({
  role: z.string().optional().openapi({
    param: { name: "role", in: "query" },
    description: "Filter by target role (partial match)",
  }),
  tag: z.string().optional().openapi({
    param: { name: "tag", in: "query" },
    description: "Filter by tag",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, role, step titles)",
  }),
});

export type ListOnboardingTemplateOptions = z.infer<
  typeof ListOnboardingTemplateOptionsSchema
>;

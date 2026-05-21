/**
 * Onboarding types — Zod schemas (single source), inferred types.
 * Tracks employee onboarding progress with categorized steps.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export const ONBOARDING_STEP_CATEGORIES = [
  "equipment",
  "accounts",
  "docs",
  "training",
  "intro",
  "other",
] as const;

export const ONBOARDING_STEP_STATUSES = [
  "not_started",
  "in_progress",
  "complete",
] as const;

export const OnboardingStepSchema = z.object({
  id: z.string().openapi({ description: "Step ID", example: "step_001" }),
  title: z.string().openapi({
    description: "Step title",
    example: "Laptop & equipment setup",
  }),
  category: z.enum(ONBOARDING_STEP_CATEGORIES).openapi({
    description: "Step category",
    example: "equipment",
  }),
  status: z.enum(ONBOARDING_STEP_STATUSES).openapi({
    description: "Step completion status",
    example: "not_started",
  }),
  owner: z.string().nullable().optional().openapi({
    description: "Person ID responsible for completing this step",
    example: "alice",
  }),
}).openapi("OnboardingStep");

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const OnboardingSchema = z.object({
  id: z.string().openapi({
    description: "Onboarding record ID",
    example: "onboarding_1708600000000_exmpl",
  }),
  employeeName: z.string().openapi({
    description: "Employee full name",
    example: "Alex Johnson",
  }),
  role: z.string().openapi({
    description: "Employee role or job title",
    example: "Software Engineer",
  }),
  startDate: z.string().nullable().optional().openapi({
    description: "Start date (YYYY-MM-DD)",
    example: "2026-02-10",
  }),
  personId: z.string().nullable().optional().openapi({
    description: "Linked person ID from people registry",
    example: "person_xxx",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes",
  }),
  steps: z.array(OnboardingStepSchema).openapi({
    description: "Ordered list of onboarding steps",
  }),
}).merge(AuditFieldsSchema).openapi("Onboarding");

export type Onboarding = z.infer<typeof OnboardingSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateOnboardingSchema = OnboardingSchema.pick({
  employeeName: true,
  role: true,
  startDate: true,
  personId: true,
  notes: true,
  steps: true,
}).partial({
  startDate: true,
  personId: true,
  notes: true,
  steps: true,
}).openapi("CreateOnboarding");

export type CreateOnboarding = z.infer<typeof CreateOnboardingSchema>;

export const UpdateOnboardingSchema = CreateOnboardingSchema.partial().openapi(
  "UpdateOnboarding",
);

export type UpdateOnboarding = z.infer<typeof UpdateOnboardingSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListOnboardingOptionsSchema = z.object({
  status: z.enum(ONBOARDING_STEP_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by overall completion status",
  }),
  role: z.string().optional().openapi({
    param: { name: "role", in: "query" },
    description: "Filter by role (partial match)",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, role, notes)",
  }),
});

export type ListOnboardingOptions = z.infer<typeof ListOnboardingOptionsSchema>;

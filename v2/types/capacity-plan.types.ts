/**
 * Capacity plan types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const TeamMemberRefSchema = z.object({
  id: z.string().openapi({
    description: "Member ref ID",
    example: "member_abc",
  }),
  personId: z.string().openapi({
    description: "Person ID from the people domain",
    example: "person_123",
  }),
  hoursPerDay: z.number().nullable().optional().openapi({
    description: "Override: available hours per day",
    example: 6,
  }),
  workingDays: z.array(z.string()).nullable().optional().openapi({
    description: "Override: working days e.g. ['Mon','Tue','Wed']",
  }),
}).openapi("TeamMemberRef");

export type TeamMemberRef = z.infer<typeof TeamMemberRefSchema>;

export const WeeklyAllocationSchema = z.object({
  id: z.string().openapi({
    description: "Allocation ID",
    example: "alloc_abc",
  }),
  memberId: z.string().openapi({ description: "TeamMemberRef ID" }),
  weekStart: z.string().openapi({
    description: "Week start date (YYYY-MM-DD)",
    example: "2026-05-11",
  }),
  allocatedHours: z.number().openapi({
    description: "Hours allocated for this week",
    example: 20,
  }),
  targetType: z.enum(["project", "task", "milestone"]).openapi({
    description: "What the allocation is targeting",
  }),
  targetId: z.string().nullable().optional().openapi({
    description: "ID of the target entity",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes",
  }),
}).openapi("WeeklyAllocation");

export type WeeklyAllocation = z.infer<typeof WeeklyAllocationSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const CapacityPlanSchema = z.object({
  id: z.string().openapi({
    description: "Capacity plan ID",
    example: "capacity_abc",
  }),
  title: z.string().openapi({
    description: "Plan title",
    example: "Q2 2026 Capacity Plan",
  }),
  date: z.string().openapi({
    description: "Plan date (YYYY-MM-DD)",
    example: "2026-05-01",
  }),
  budgetHours: z.number().nullable().optional().openapi({
    description: "Total budget hours for the plan period",
    example: 160,
  }),
  teamMembers: z.array(TeamMemberRefSchema).openapi({
    description: "Team member references with optional overrides",
  }),
  allocations: z.array(WeeklyAllocationSchema).openapi({
    description: "Weekly allocation entries",
  }),
}).merge(AuditFieldsSchema).openapi("CapacityPlan");

export type CapacityPlan = z.infer<typeof CapacityPlanSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from CapacityPlanSchema
// ---------------------------------------------------------------------------

export const CreateCapacityPlanSchema = CapacityPlanSchema.pick({
  title: true,
  date: true,
  budgetHours: true,
  teamMembers: true,
  allocations: true,
}).partial({
  date: true,
  budgetHours: true,
  teamMembers: true,
  allocations: true,
}).openapi("CreateCapacityPlan");

export type CreateCapacityPlan = z.infer<typeof CreateCapacityPlanSchema>;

export const UpdateCapacityPlanSchema = CreateCapacityPlanSchema.partial()
  .openapi(
    "UpdateCapacityPlan",
  );

export type UpdateCapacityPlan = z.infer<typeof UpdateCapacityPlanSchema>;

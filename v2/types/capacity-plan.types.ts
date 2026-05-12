/**
 * Capacity plan types — Zod schemas (single source), inferred types.
 *
 * ProjectAllocation replaces WeeklyAllocation: one row per person-project pair
 * with a percentage or hours/week. The weekly grid is computed from the plan
 * period + member availability, not stored manually.
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
    description: "Override: available hours per day (default 8)",
    example: 6,
  }),
  workingDays: z.array(z.string()).nullable().optional().openapi({
    description: "Override: working days e.g. ['Mon','Tue','Wed'] (default 5)",
  }),
}).openapi("TeamMemberRef");

export type TeamMemberRef = z.infer<typeof TeamMemberRefSchema>;

export const ProjectAllocationSchema = z.object({
  id: z.string().openapi({
    description: "Allocation ID",
    example: "alloc_abc",
  }),
  personId: z.string().openapi({
    description: "Person ID (matches TeamMemberRef.personId)",
    example: "person_123",
  }),
  targetType: z.enum(["project", "milestone"]).openapi({
    description: "What the allocation targets",
    example: "project",
  }),
  targetId: z.string().openapi({
    description: "Portfolio item ID (project) or milestone ID",
    example: "portfolio_456",
  }),
  percentage: z.number().min(0).max(100).nullable().optional().openapi({
    description: "Percentage of available weekly hours (0–100)",
    example: 50,
  }),
  hoursPerWeek: z.number().nullable().optional().openapi({
    description: "Fixed hours per week (alternative to percentage)",
    example: 20,
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes",
  }),
}).openapi("ProjectAllocation");

export const allocationMutexRefine = (
  val: { percentage?: number | null; hoursPerWeek?: number | null },
  ctx: z.RefinementCtx,
) => {
  if (val.percentage != null && val.hoursPerWeek != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either percentage or hoursPerWeek, not both",
      path: ["hoursPerWeek"],
    });
  }
};

export type ProjectAllocation = z.infer<typeof ProjectAllocationSchema>;

// ---------------------------------------------------------------------------
// Capacity plan schema
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
  startDate: z.string().nullable().optional().openapi({
    description: "Plan start date (YYYY-MM-DD)",
    example: "2026-04-01",
  }),
  endDate: z.string().nullable().optional().openapi({
    description: "Plan end date (YYYY-MM-DD)",
    example: "2026-06-30",
  }),
  budgetHours: z.number().nullable().optional().openapi({
    description: "Total budget hours for the plan period",
    example: 160,
  }),
  teamMembers: z.array(TeamMemberRefSchema).openapi({
    description: "Team members with optional capacity overrides",
  }),
  allocations: z.array(ProjectAllocationSchema).openapi({
    description: "Per-person-per-project allocations (% or h/week)",
  }),
}).merge(AuditFieldsSchema).openapi("CapacityPlan");

export type CapacityPlan = z.infer<typeof CapacityPlanSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateCapacityPlanSchema = CapacityPlanSchema.pick({
  title: true,
  startDate: true,
  endDate: true,
  budgetHours: true,
  teamMembers: true,
  allocations: true,
}).partial({
  startDate: true,
  endDate: true,
  budgetHours: true,
  teamMembers: true,
  allocations: true,
}).openapi("CreateCapacityPlan");

export type CreateCapacityPlan = z.infer<typeof CreateCapacityPlanSchema>;

export const UpdateCapacityPlanSchema = CreateCapacityPlanSchema.partial()
  .openapi("UpdateCapacityPlan");

export type UpdateCapacityPlan = z.infer<typeof UpdateCapacityPlanSchema>;

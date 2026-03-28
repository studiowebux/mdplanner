/**
 * Marketing Plan types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MARKETING_PLAN_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export const MARKETING_ITEM_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
] as const;

export const MARKETING_PLAN_COMPLETED_STATUSES = new Set([
  "completed",
  "archived",
]);

// ---------------------------------------------------------------------------
// Sub-schemas — nested structured arrays
// ---------------------------------------------------------------------------

export const MarketingTargetAudienceSchema = z.object({
  name: z.string().openapi({
    description: "Audience segment name",
    example: "Enterprise SaaS buyers",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Audience description",
  }),
  size: z.string().nullable().optional().openapi({
    description: "Estimated audience size",
    example: "10k-50k",
  }),
}).openapi("MarketingTargetAudience");

export type MarketingTargetAudience = z.infer<
  typeof MarketingTargetAudienceSchema
>;

export const MarketingChannelSchema = z.object({
  name: z.string().openapi({
    description: "Channel name",
    example: "Social Media",
  }),
  budget: z.number().nullable().optional().openapi({
    description: "Channel budget allocation",
    example: 15000,
  }),
  goals: z.string().nullable().optional().openapi({
    description: "Channel goals",
    example: "Increase engagement by 25%",
  }),
  status: z.enum(MARKETING_ITEM_STATUSES).optional().openapi({
    description: "Channel status",
    example: "active",
  }),
}).openapi("MarketingChannel");

export type MarketingChannel = z.infer<typeof MarketingChannelSchema>;

export const MarketingCampaignSchema = z.object({
  name: z.string().openapi({
    description: "Campaign name",
    example: "Spring Launch",
  }),
  channel: z.string().nullable().optional().openapi({
    description: "Associated channel name",
    example: "Social Media",
  }),
  budget: z.number().nullable().optional().openapi({
    description: "Campaign budget",
    example: 5000,
  }),
  startDate: z.string().nullable().optional().openapi({
    description: "Campaign start date (YYYY-MM-DD)",
    example: "2026-03-01",
  }),
  endDate: z.string().nullable().optional().openapi({
    description: "Campaign end date (YYYY-MM-DD)",
    example: "2026-03-31",
  }),
  status: z.enum(MARKETING_ITEM_STATUSES).optional().openapi({
    description: "Campaign status",
    example: "planned",
  }),
  goals: z.string().nullable().optional().openapi({
    description: "Campaign goals",
    example: "Generate 500 qualified leads",
  }),
}).openapi("MarketingCampaign");

export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const MarketingPlanSchema = z.object({
  id: z.string().openapi({
    description: "Marketing Plan ID",
    example: "mktplan_1771738300356_k3tyt4",
  }),
  name: z.string().openapi({
    description: "Plan name",
    example: "Q2 Product Launch",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Plan description",
  }),
  status: z.enum(MARKETING_PLAN_STATUSES).openapi({
    description: "Plan status",
    example: "draft",
  }),
  budgetTotal: z.number().nullable().optional().openapi({
    description: "Total budget",
    example: 50000,
  }),
  budgetCurrency: z.string().nullable().optional().openapi({
    description: "Budget currency code",
    example: "USD",
  }),
  startDate: z.string().nullable().optional().openapi({
    description: "Plan start date (YYYY-MM-DD)",
    example: "2026-03-01",
  }),
  endDate: z.string().nullable().optional().openapi({
    description: "Plan end date (YYYY-MM-DD)",
    example: "2026-06-30",
  }),
  targetAudiences: z.array(MarketingTargetAudienceSchema).nullable().optional()
    .openapi({
      description: "Target audience segments",
    }),
  channels: z.array(MarketingChannelSchema).nullable().optional().openapi({
    description: "Marketing channels",
  }),
  campaigns: z.array(MarketingCampaignSchema).nullable().optional().openapi({
    description: "Marketing campaigns",
  }),
  linkedGoals: z.array(z.string()).nullable().optional().openapi({
    description: "Linked goal IDs — KPI tracking lives in the goals module",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  responsible: z.string().nullable().optional().openapi({
    description: "Person ID of the plan owner",
  }),
  team: z.array(z.string()).nullable().optional().openapi({
    description: "Person IDs of team members",
  }),
  hypothesis: z.array(z.object({
    text: z.string().openapi({ description: "Hypothesis statement" }),
    verdict: z.string().nullable().optional().openapi({
      description: "Verdict: confirmed, rejected, partial, or pending",
      example: "confirmed",
    }),
  })).nullable().optional().openapi({
    description: "What we believe will happen",
  }),
  learnings: z.array(z.object({
    text: z.string().openapi({ description: "Learning or discovery" }),
  })).nullable().optional().openapi({
    description: "What we discovered after execution",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Plan notes (markdown)",
  }),
  created: z.string().openapi({ description: "ISO creation timestamp" }),
  updated: z.string().openapi({ description: "ISO last-updated timestamp" }),
}).openapi("MarketingPlan");

export type MarketingPlan = z.infer<typeof MarketingPlanSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from MarketingPlanSchema
// ---------------------------------------------------------------------------

export const CreateMarketingPlanSchema = MarketingPlanSchema.pick({
  name: true,
  description: true,
  status: true,
  budgetTotal: true,
  budgetCurrency: true,
  startDate: true,
  endDate: true,
  targetAudiences: true,
  channels: true,
  campaigns: true,
  linkedGoals: true,
  project: true,
  responsible: true,
  team: true,
  hypothesis: true,
  learnings: true,
  notes: true,
}).partial({
  status: true,
}).openapi("CreateMarketingPlan");

export type CreateMarketingPlan = z.infer<typeof CreateMarketingPlanSchema>;

export const UpdateMarketingPlanSchema = CreateMarketingPlanSchema.partial()
  .openapi("UpdateMarketingPlan");

export type UpdateMarketingPlan = z.infer<typeof UpdateMarketingPlanSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListMarketingPlanOptionsSchema = z.object({
  status: z.enum(MARKETING_PLAN_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, description, and notes)",
  }),
});

export type ListMarketingPlanOptions = z.infer<
  typeof ListMarketingPlanOptionsSchema
>;

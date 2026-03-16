import { z } from "@hono/zod-openapi";

export const PortfolioKpiSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  target: z.union([z.string(), z.number()]).optional(),
  unit: z.string().optional(),
});

export const PortfolioUrlSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const PortfolioStatusUpdateSchema = z.object({
  id: z.string(),
  date: z.string(),
  message: z.string(),
});

export const PortfolioItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  description: z.string().optional(),
  client: z.string().optional(),
  revenue: z.number().optional(),
  expenses: z.number().optional(),
  progress: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  team: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  logo: z.string().optional(),
  license: z.string().optional(),
  githubRepo: z.string().optional(),
  billingCustomerId: z.string().optional(),
  brainManaged: z.boolean().optional(),
  linkedGoals: z.array(z.string()).optional(),
  kpis: z.array(PortfolioKpiSchema).optional(),
  urls: z.array(PortfolioUrlSchema).optional(),
  statusUpdates: z.array(PortfolioStatusUpdateSchema).optional(),
}).openapi("PortfolioItem");

export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
export type PortfolioKpi = z.infer<typeof PortfolioKpiSchema>;
export type PortfolioUrl = z.infer<typeof PortfolioUrlSchema>;
export type PortfolioStatusUpdate = z.infer<typeof PortfolioStatusUpdateSchema>;

export const PortfolioSummarySchema = z.object({
  total: z.number(),
  byStatus: z.record(z.number()),
  byCategory: z.record(z.number()),
  avgProgress: z.number(),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
}).openapi("PortfolioSummary");

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

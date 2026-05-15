/**
 * Reflection types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

export const REFLECTION_PERIODS = [
  "weekly",
  "monthly",
  "quarterly",
  "annual",
] as const;
export type ReflectionPeriod = (typeof REFLECTION_PERIODS)[number];

export const REFLECTION_PERIOD_LABELS: Record<ReflectionPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export const ReflectionSchema = z.object({
  id: z.string().openapi({
    description: "Reflection ID",
    example: "reflection_20260101",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "Reflection title",
    example: "Week 1 retrospective",
  }),
  period: z.enum(REFLECTION_PERIODS).openapi({
    description: "Reflection period",
    example: "weekly",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({
    description: "Reflection date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  templateId: z.string().nullable().optional().openapi({
    description: "ID of the reflection template used",
  }),
  content: z.string().nullable().optional().openapi({
    description: "Reflection body (markdown)",
  }),
  tags: stringArray.nullable().optional(),
}).merge(AuditFieldsSchema).openapi("Reflection");

export type Reflection = z.infer<typeof ReflectionSchema>;

export const CreateReflectionSchema = ReflectionSchema.pick({
  title: true,
  period: true,
  date: true,
  templateId: true,
  content: true,
  tags: true,
}).partial({
  period: true,
  templateId: true,
  content: true,
  tags: true,
}).openapi("CreateReflection");

export type CreateReflection = z.infer<typeof CreateReflectionSchema>;

export const UpdateReflectionSchema = CreateReflectionSchema.partial().openapi(
  "UpdateReflection",
);
export type UpdateReflection = z.infer<typeof UpdateReflectionSchema>;

export const ListReflectionOptionsSchema = z.object({
  q: z.string().optional().openapi({ param: { name: "q", in: "query" } }),
  period: z.enum(REFLECTION_PERIODS).optional().openapi({
    param: { name: "period", in: "query" },
  }),
  tag: z.string().optional().openapi({ param: { name: "tag", in: "query" } }),
  from: z.string().optional().openapi({
    param: { name: "from", in: "query" },
    description: "Start date inclusive (YYYY-MM-DD)",
  }),
  to: z.string().optional().openapi({
    param: { name: "to", in: "query" },
    description: "End date inclusive (YYYY-MM-DD)",
  }),
});

export type ListReflectionOptions = z.infer<typeof ListReflectionOptionsSchema>;

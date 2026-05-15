/**
 * Habit types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";
// stringArray used by tags below

export const HABIT_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export const CompletionEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
}).openapi("CompletionEntry");

export type CompletionEntry = z.infer<typeof CompletionEntrySchema>;

export const HABIT_FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const HabitSchema = z.object({
  id: z.string().openapi({ description: "Habit ID", example: "habit_meditate" }),
  title: z.string().min(1).max(200).openapi({
    description: "Habit title",
    example: "Morning meditation",
  }),
  description: z.string().nullable().optional().openapi({
    description: "Habit notes (markdown)",
  }),
  frequency: z.enum(HABIT_FREQUENCIES).openapi({
    description: "How often the habit should be performed",
    example: "daily",
  }),
  targetPerPeriod: z.number().int().min(1).openapi({
    description: "Target completions per period",
    example: 1,
  }),
  unit: z.string().nullable().optional().openapi({
    description: "Unit label (e.g. times, minutes, pages)",
    example: "times",
  }),
  completedDates: z.array(CompletionEntrySchema).openapi({
    description: "Completion entries (date + optional note)",
  }),
  color: z.string().nullable().optional().openapi({
    description: "Accent color (CSS var name or hex)",
    example: "--color-success",
  }),
  tags: stringArray.nullable().optional(),
}).merge(AuditFieldsSchema).openapi("Habit");

export type Habit = z.infer<typeof HabitSchema>;

export const CreateHabitSchema = HabitSchema.pick({
  title: true,
  description: true,
  frequency: true,
  targetPerPeriod: true,
  unit: true,
  completedDates: true,
  color: true,
  tags: true,
}).partial({
  description: true,
  frequency: true,
  targetPerPeriod: true,
  unit: true,
  completedDates: true,
  color: true,
  tags: true,
}).openapi("CreateHabit");

export type CreateHabit = z.infer<typeof CreateHabitSchema>;

export const UpdateHabitSchema = CreateHabitSchema.partial().openapi("UpdateHabit");
export type UpdateHabit = z.infer<typeof UpdateHabitSchema>;

export const ListHabitOptionsSchema = z.object({
  q: z.string().optional().openapi({ param: { name: "q", in: "query" } }),
  frequency: z.enum(HABIT_FREQUENCIES).optional().openapi({
    param: { name: "frequency", in: "query" },
  }),
  tag: z.string().optional().openapi({ param: { name: "tag", in: "query" } }),
});

export type ListHabitOptions = z.infer<typeof ListHabitOptionsSchema>;

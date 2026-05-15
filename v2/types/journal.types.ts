/**
 * Journal entry types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

export const JOURNAL_MOODS = [
  "great",
  "good",
  "neutral",
  "bad",
  "awful",
] as const;
export type JournalMood = (typeof JOURNAL_MOODS)[number];

export const JOURNAL_MOOD_LABELS: Record<JournalMood, string> = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  bad: "Bad",
  awful: "Awful",
};

export const JournalEntrySchema = z.object({
  id: z.string().openapi({
    description: "Journal entry ID",
    example: "journal_20260101",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "Entry title",
    example: "Morning reflection",
  }),
  content: z.string().nullable().optional().openapi({
    description: "Entry body (markdown)",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({
    description: "Entry date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  mood: z.enum(JOURNAL_MOODS).nullable().optional().openapi({
    description: "Mood at time of writing",
    example: "good",
  }),
  tags: stringArray.nullable().optional(),
}).merge(AuditFieldsSchema).openapi("JournalEntry");

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const CreateJournalEntrySchema = JournalEntrySchema.pick({
  title: true,
  content: true,
  date: true,
  mood: true,
  tags: true,
}).partial({
  content: true,
  mood: true,
  tags: true,
}).openapi("CreateJournalEntry");

export type CreateJournalEntry = z.infer<typeof CreateJournalEntrySchema>;

export const UpdateJournalEntrySchema = CreateJournalEntrySchema.partial()
  .openapi(
    "UpdateJournalEntry",
  );
export type UpdateJournalEntry = z.infer<typeof UpdateJournalEntrySchema>;

export const ListJournalOptionsSchema = z.object({
  q: z.string().optional().openapi({ param: { name: "q", in: "query" } }),
  mood: z.enum(JOURNAL_MOODS).optional().openapi({
    param: { name: "mood", in: "query" },
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

export type ListJournalOptions = z.infer<typeof ListJournalOptionsSchema>;

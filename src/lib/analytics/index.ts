/**
 * Analytics aggregator.
 *
 * Extension pattern:
 *   1. Create a new provider in providers/ that exports a Stats type and a
 *      collect* function.
 *   2. Add the typed field to AnalyticsPayload.
 *   3. Add one entry to PROVIDERS.
 *
 * Nothing else needs to change. The GET /api/analytics endpoint picks up new
 * providers automatically and includes them in the response.
 */

import { DirectoryMarkdownParser } from "../parser/directory/parser.ts";
import { collectTaskStats, type TaskStats } from "./providers/tasks.ts";
import { collectGoalStats, type GoalStats } from "./providers/goals.ts";
import {
  collectMeetingStats,
  type MeetingStats,
} from "./providers/meetings.ts";
import { collectPeopleStats, type PeopleStats } from "./providers/people.ts";
import { collectNotesStats, type NotesStats } from "./providers/notes.ts";
import { collectStorageStats, type StorageStats } from "./providers/storage.ts";

// Re-export individual stat types for consumers that need them
export type {
  GoalStats,
  MeetingStats,
  NotesStats,
  PeopleStats,
  StorageStats,
  TaskStats,
};

// ---------------------------------------------------------------------------
// Payload — the shape returned by GET /api/analytics
// ---------------------------------------------------------------------------

export interface AnalyticsPayload {
  tasks: TaskStats;
  goals: GoalStats;
  meetings: MeetingStats;
  people: PeopleStats;
  notes: NotesStats;
  storage: StorageStats;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
// Each entry maps a key on AnalyticsPayload to a collect function.
// The collect function receives the parser and the project directory path.
// Providers that only need the parser omit the second argument.

type ProviderFn<T> = (
  parser: DirectoryMarkdownParser,
  projectDir: string,
) => Promise<T>;

type ProviderEntry = {
  [K in keyof Omit<AnalyticsPayload, "generatedAt">]: {
    key: K;
    collect: ProviderFn<AnalyticsPayload[K]>;
  };
}[keyof Omit<AnalyticsPayload, "generatedAt">];

// Registry — add one entry here to expose a new analytics group
const PROVIDERS: ProviderEntry[] = [
  { key: "tasks", collect: (p) => collectTaskStats(p) },
  { key: "goals", collect: (p) => collectGoalStats(p) },
  { key: "meetings", collect: (p) => collectMeetingStats(p) },
  { key: "people", collect: (p) => collectPeopleStats(p) },
  { key: "notes", collect: (p) => collectNotesStats(p) },
  { key: "storage", collect: (_, dir) => collectStorageStats(dir) },
];

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

export async function collectAnalytics(
  parser: DirectoryMarkdownParser,
  projectDir: string,
): Promise<AnalyticsPayload> {
  const results = await Promise.all(
    PROVIDERS.map(async (p) => ({
      key: p.key,
      value: await p.collect(parser, projectDir),
    })),
  );

  const payload = results.reduce(
    (acc, { key, value }) => ({ ...acc, [key]: value }),
    {} as Partial<AnalyticsPayload>,
  );

  return {
    ...(payload as AnalyticsPayload),
    generatedAt: new Date().toISOString(),
  };
}

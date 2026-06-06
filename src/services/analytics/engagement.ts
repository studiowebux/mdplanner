// Analytics collectors — engagement/personal domain: meetings, notes, habits,
// journal, reflections.

import {
  getHabitService,
  getJournalService,
  getMeetingService,
  getNoteService,
  getReflectionService,
} from "../../singletons/services.ts";
import type {
  AnalyticsFilters,
  HabitStats,
  JournalStats,
  MeetingStats,
  NoteStats,
  ReflectionStats,
} from "../../types/analytics.types.ts";
import { defaultScope, type UserScope } from "../../utils/actor.ts";
import {
  dailySeries,
  inDateRange,
  monthlySeries,
  weeklySeries,
  weekStartKey,
} from "./series.ts";

const REFLECTION_MONTH_WINDOW = 12;
const MEETING_WEEK_WINDOW = 12;
const JOURNAL_DAY_WINDOW = 90;

/** Meeting counts (total, by project, and a weekly series) within the filter range. */
export async function collectMeetingStats(
  filters: AnalyticsFilters,
): Promise<MeetingStats> {
  const meetings = await getMeetingService().list(
    filters.project ? { project: filters.project } : {},
  );
  const byProject: Record<string, number> = {};
  const byWeek: Record<string, number> = {};
  for (const m of meetings) {
    if (!inDateRange(m.date, filters.from, filters.to)) continue;
    const p = m.project ?? "Unassigned";
    byProject[p] = (byProject[p] ?? 0) + 1;
    if (m.date) {
      const wk = weekStartKey(new Date(m.date));
      byWeek[wk] = (byWeek[wk] ?? 0) + 1;
    }
  }
  return {
    total: meetings.length,
    byProject,
    byWeek: weeklySeries(byWeek, MEETING_WEEK_WINDOW, filters.to),
  };
}

/** Note counts grouped by `[type]` title prefix and by project (filters ignored). */
export async function collectNoteStats(
  _filters: AnalyticsFilters,
): Promise<NoteStats> {
  const notes = await getNoteService().list();
  const byType: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  for (const n of notes) {
    const titleMatch = n.title.match(/^\[([^\]]+)\]/);
    const type = titleMatch ? titleMatch[1] : "note";
    byType[type] = (byType[type] ?? 0) + 1;
    const proj = n.project ?? "Unassigned";
    byProject[proj] = (byProject[proj] ?? 0) + 1;
  }
  return { total: notes.length, byType, byProject };
}

/**
 * Per-user habit completion for the current month (grid + completion rate).
 * Counts only the acting user's completions; falls back to the project default
 * user when no scope is given (which also owns legacy untagged entries).
 */
export async function collectHabitStats(
  _filters: AnalyticsFilters,
  scope?: UserScope,
): Promise<HabitStats> {
  // Completion rate is per-user: count only the acting user's completions.
  // Without a request scope (e.g. unauthenticated API), fall back to the
  // project default user, which also owns legacy untagged entries.
  const userScope = scope ?? await defaultScope();
  const habits = await getHabitService().listForUser({}, userScope);
  if (habits.length === 0) {
    return { total: 0, completionRateThisMonth: null, currentMonth: [] };
  }

  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const daysElapsed = now.getDate();
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  let totalCompletions = 0;
  const currentMonth = habits.map((h) => {
    const completions = new Array(daysInMonth).fill(false);
    for (const entry of h.completedDates ?? []) {
      if (entry.date.startsWith(yearMonth)) {
        totalCompletions++;
        completions[Number(entry.date.slice(8, 10)) - 1] = true;
      }
    }
    return { habitId: h.id, habitName: h.title, completions };
  });

  const possible = habits.length * daysElapsed;
  const completionRateThisMonth = possible > 0
    ? Math.round((totalCompletions / possible) * 100)
    : null;

  return { total: habits.length, completionRateThisMonth, currentMonth };
}

/** Journal totals plus this-month/this-week counts, current streak, and a 90-day daily series. */
export async function collectJournalStats(
  _filters: AnalyticsFilters,
): Promise<JournalStats> {
  const entries = await getJournalService().list();
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7);

  // Week start (Monday)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  let thisMonth = 0;
  let thisWeek = 0;
  const datesWithEntry = new Set<string>();
  const byDay: Record<string, number> = {};

  for (const e of entries) {
    if (e.date.startsWith(yearMonth)) thisMonth++;
    if (e.date >= weekStartStr && e.date <= todayStr) thisWeek++;
    datesWithEntry.add(e.date);
    const day = e.date.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  // Streak: consecutive days ending today (or yesterday if no entry today)
  let streak = 0;
  const cursor = new Date(now);
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!datesWithEntry.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    total: entries.length,
    thisMonth,
    thisWeek,
    streak,
    last90Days: dailySeries(byDay, JOURNAL_DAY_WINDOW),
  };
}

/** Reflection totals and a 12-month series (filters ignored). */
export async function collectReflectionStats(
  _filters: AnalyticsFilters,
): Promise<ReflectionStats> {
  const reflections = await getReflectionService().list();
  const yearMonth = new Date().toISOString().slice(0, 7);
  let thisMonth = 0;
  const byMonth: Record<string, number> = {};
  for (const r of reflections) {
    if (r.date.startsWith(yearMonth)) thisMonth++;
    byMonth[r.date.slice(0, 7)] = (byMonth[r.date.slice(0, 7)] ?? 0) + 1;
  }
  return {
    total: reflections.length,
    thisMonth,
    byMonth: monthlySeries(byMonth, REFLECTION_MONTH_WINDOW).map((d) => ({
      month: d.month,
      count: d.amount,
    })),
  };
}

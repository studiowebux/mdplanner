/**
 * Task statistics provider.
 * Computes completion counts, section breakdown, weekly due-date trend,
 * overdue count, and priority distribution from the task collection.
 */

import { DirectoryMarkdownParser } from "../../parser/directory/parser.ts";
import type { Task } from "../../types.ts";

export interface SectionStat {
  name: string;
  total: number;
  completed: number;
  percent: number;
}

export interface WeekStat {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekLabel: string; // "Feb 17" or "This week"
  count: number; // tasks with due_date in this week
}

export interface PriorityStat {
  label: string;
  count: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  completionRate: number; // 0–100, rounded
  bySection: SectionStat[];
  weeklyDue: WeekStat[]; // last 8 weeks (oldest → newest)
  byPriority: PriorityStat[];
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Flat task list (includes subtasks)
// ---------------------------------------------------------------------------

function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const walk = (list: Task[]) => {
    for (const t of list) {
      result.push(t);
      if (t.children?.length) walk(t.children);
    }
  };
  walk(tasks);
  return result;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const PRIORITY_LABELS: Record<number, string> = {
  1: "P1 — Critical",
  2: "P2 — High",
  3: "P3 — Medium",
  4: "P4 — Low",
  0: "No priority",
};

export async function collectTaskStats(
  parser: DirectoryMarkdownParser,
): Promise<TaskStats> {
  const raw = await parser.readTasks();
  const tasks = flattenTasks(raw);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toISODate(today);

  // Core counts
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const open = total - completed;
  const overdue = tasks.filter(
    (t) => !t.completed && !!t.config.due_date && t.config.due_date < todayStr,
  ).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // By section
  const sectionMap = new Map<string, { total: number; completed: number }>();
  for (const t of tasks) {
    const key = t.section || "Unsectioned";
    const entry = sectionMap.get(key) ?? { total: 0, completed: 0 };
    entry.total++;
    if (t.completed) entry.completed++;
    sectionMap.set(key, entry);
  }
  const bySection: SectionStat[] = [...sectionMap.entries()].map(
    ([name, e]) => ({
      name,
      total: e.total,
      completed: e.completed,
      percent: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
    }),
  );

  // Weekly due (last 8 weeks, oldest first)
  const thisMonday = getMondayOfWeek(today);
  const weeklyDue: WeekStat[] = [];
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const start = toISODate(monday);
    const end = toISODate(sunday);
    const count = tasks.filter(
      (t) =>
        !!t.config.due_date &&
        t.config.due_date >= start &&
        t.config.due_date <= end,
    ).length;
    weeklyDue.push({
      weekStart: start,
      weekLabel: i === 0 ? "This week" : formatWeekLabel(monday),
      count,
    });
  }

  // By priority
  const priorityCount = new Map<number, number>();
  for (const t of tasks) {
    const p = t.config.priority ?? 0;
    priorityCount.set(p, (priorityCount.get(p) ?? 0) + 1);
  }
  const byPriority: PriorityStat[] = [1, 2, 3, 4, 0]
    .filter((p) => (priorityCount.get(p) ?? 0) > 0)
    .map((p) => ({
      label: PRIORITY_LABELS[p] ?? `P${p}`,
      count: priorityCount.get(p) ?? 0,
    }));

  return {
    total,
    completed,
    open,
    overdue,
    completionRate,
    bySection,
    weeklyDue,
    byPriority,
  };
}

// Analytics collectors — delivery/work domain: tasks, goals, milestones,
// time entries, capacity plans.

import {
  getCapacityPlanService,
  getGoalService,
  getMilestoneService,
  getTaskService,
} from "../../singletons/services.ts";
import type {
  AnalyticsFilters,
  CapacityPlanStats,
  GoalStats,
  MilestoneStats,
  TaskStats,
  TimeEntryStats,
} from "../../types/analytics.types.ts";
import { inDateRange } from "./series.ts";

// Hours-per-day line chart window (last N calendar days, anchored to filters.to).
const HOURS_PER_DAY_WINDOW = 30;

/** Task counts grouped by section, priority, and project for the filtered project. */
export async function collectTaskStats(
  filters: AnalyticsFilters,
): Promise<TaskStats> {
  const tasks = await getTaskService().list(
    filters.project ? { project: filters.project } : {},
  );
  const bySection: Record<string, number> = {};
  const byPriority: Record<number, number> = {};
  const byProject: Record<string, number> = {};
  for (const t of tasks) {
    const sec = t.section ?? "Unknown";
    bySection[sec] = (bySection[sec] ?? 0) + 1;
    const pri = t.priority ?? 0;
    byPriority[pri] = (byPriority[pri] ?? 0) + 1;
    const proj = t.project ?? "Unassigned";
    byProject[proj] = (byProject[proj] ?? 0) + 1;
  }
  return { total: tasks.length, bySection, byPriority, byProject };
}

/** Goal counts grouped by status and type for the filtered project. */
export async function collectGoalStats(
  filters: AnalyticsFilters,
): Promise<GoalStats> {
  const goals = await getGoalService().list(
    filters.project ? { project: filters.project } : {},
  );
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const g of goals) {
    const s = g.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const t = g.type ?? "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
  }
  return { total: goals.length, byStatus, byType };
}

/** Per-milestone task/done counts and progress (filters ignored). */
export async function collectMilestoneStats(
  _filters: AnalyticsFilters,
): Promise<MilestoneStats> {
  const milestones = await getMilestoneService().list();
  const result = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    taskCount: m.taskCount,
    doneCount: m.completedCount,
    progress: m.progress,
  }));
  return { total: milestones.length, milestones: result };
}

/**
 * Logged hours aggregated by person, project, and day, plus a 0-filled 30-day
 * series anchored at filters.to (or today). Honors date and person filters.
 */
export async function collectTimeEntryStats(
  filters: AnalyticsFilters,
): Promise<TimeEntryStats> {
  const tasks = await getTaskService().list(
    filters.project ? { project: filters.project } : {},
  );
  const byPerson: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let totalHours = 0;
  let entryCount = 0;

  for (const t of tasks) {
    for (const e of t.time_entries ?? []) {
      if (!inDateRange(e.date, filters.from, filters.to)) continue;
      if (filters.person && e.person !== filters.person) continue;
      totalHours += e.hours;
      entryCount++;
      const person = e.person ?? "Unknown";
      byPerson[person] = (byPerson[person] ?? 0) + e.hours;
      const proj = t.project ?? "Unassigned";
      byProject[proj] = (byProject[proj] ?? 0) + e.hours;
      const day = e.date.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + e.hours;
    }
  }

  // 30-day series ending at the filter's upper bound (or today), oldest first.
  // Missing days are 0-filled so the line chart stays continuous.
  const cursor = filters.to ? new Date(filters.to) : new Date();
  const hoursPerDay: Array<{ date: string; hours: number }> = [];
  for (let i = 0; i < HOURS_PER_DAY_WINDOW; i++) {
    const key = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
    hoursPerDay.unshift({
      date: key,
      hours: Math.round((byDay[key] ?? 0) * 100) / 100,
    });
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    byPerson: Object.fromEntries(
      Object.entries(byPerson).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
    byProject: Object.fromEntries(
      Object.entries(byProject).map(([k, v]) => [
        k,
        Math.round(v * 100) / 100,
      ]),
    ),
    entryCount,
    hoursPerDay,
  };
}

function planWeeks(startDate?: string | null, endDate?: string | null): number {
  if (!startDate || !endDate) return 4;
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  const weeks = ms / (7 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.round(weeks));
}

function memberWeeklyCapacity(
  hoursPerDay: number | null | undefined,
  workingDays: string[] | null | undefined,
): number {
  const hpd = hoursPerDay ?? 8;
  const days = workingDays?.length ?? 5;
  return hpd * days;
}

/** Per-plan allocated vs budget hours and utilization, derived from member capacity (filters ignored). */
export async function collectCapacityStats(
  _filters: AnalyticsFilters,
): Promise<CapacityPlanStats> {
  const plans = await getCapacityPlanService().list();
  return {
    plans: plans.map((p) => {
      const weeks = planWeeks(p.startDate, p.endDate);
      const memberCapacity = new Map<string, number>(
        (p.teamMembers ?? []).map((m) => [
          m.personId,
          memberWeeklyCapacity(m.hoursPerDay, m.workingDays),
        ]),
      );

      const allocatedHours = (p.allocations ?? []).reduce((sum, a) => {
        let weeklyH = 0;
        if (a.hoursPerWeek != null) {
          weeklyH = a.hoursPerWeek;
        } else if (a.percentage != null) {
          const cap = memberCapacity.get(a.personId) ?? 40;
          weeklyH = (a.percentage / 100) * cap;
        }
        return sum + weeklyH * weeks;
      }, 0);

      const budget = p.budgetHours ?? null;
      return {
        id: p.id,
        name: p.title,
        budgetHours: budget,
        allocatedHours: Math.round(allocatedHours * 100) / 100,
        utilizationPct: budget != null && budget > 0
          ? Math.round((allocatedHours / budget) * 100)
          : null,
      };
    }),
  };
}

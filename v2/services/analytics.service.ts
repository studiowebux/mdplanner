// Analytics aggregation service — reads from domain services, no storage of its own.

import {
  getCapacityPlanService,
  getCustomerService,
  getGoalService,
  getInvoiceService,
  getMeetingService,
  getMilestoneService,
  getNoteService,
  getQuoteService,
  getTaskService,
} from "../singletons/services.ts";
import type {
  AnalyticsData,
  AnalyticsFilters,
  CapacityPlanStats,
  CustomerStats,
  GoalStats,
  InvoiceStats,
  MeetingStats,
  MilestoneStats,
  NoteStats,
  QuoteStats,
  TaskStats,
  TimeEntryStats,
} from "../types/analytics.types.ts";

function inDateRange(
  date: string | null | undefined,
  from?: string,
  to?: string,
): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

async function collectTaskStats(
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

async function collectGoalStats(
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

async function collectMilestoneStats(
  _filters: AnalyticsFilters,
): Promise<MilestoneStats> {
  const milestones = await getMilestoneService().list();
  const result = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    taskCount: (m as unknown as { taskCount?: number }).taskCount ?? 0,
    doneCount: (m as unknown as { doneCount?: number }).doneCount ?? 0,
    progress: (m as unknown as { progress?: number }).progress ?? 0,
  }));
  return { total: milestones.length, milestones: result };
}

async function collectTimeEntryStats(
  filters: AnalyticsFilters,
): Promise<TimeEntryStats> {
  const tasks = await getTaskService().list(
    filters.project ? { project: filters.project } : {},
  );
  const byPerson: Record<string, number> = {};
  const byProject: Record<string, number> = {};
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
    }
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

async function collectCapacityStats(
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

async function collectInvoiceStats(
  filters: AnalyticsFilters,
): Promise<InvoiceStats> {
  const invoices = await getInvoiceService().list(
    filters.customer ? { customerId: filters.customer } : {},
  );
  const byStatus: Record<string, number> = {};
  const amountByStatus: Record<string, number> = {};
  let total = 0;
  let totalAmount = 0;
  for (const inv of invoices) {
    if (!inDateRange(inv.createdAt, filters.from, filters.to)) continue;
    total++;
    const s = inv.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    amountByStatus[s] = (amountByStatus[s] ?? 0) + (inv.total ?? 0);
    totalAmount += inv.total ?? 0;
  }
  return {
    total,
    totalAmount: Math.round(totalAmount * 100) / 100,
    byStatus,
    amountByStatus: Object.fromEntries(
      Object.entries(amountByStatus).map(([k, v]) => [
        k,
        Math.round(v * 100) / 100,
      ]),
    ),
  };
}

async function collectQuoteStats(
  filters: AnalyticsFilters,
): Promise<QuoteStats> {
  const quotes = await getQuoteService().list(
    filters.customer ? { customerId: filters.customer } : {},
  );
  const byStatus: Record<string, number> = {};
  const amountByStatus: Record<string, number> = {};
  let total = 0;
  let totalAmount = 0;
  for (const q of quotes) {
    if (!inDateRange(q.createdAt, filters.from, filters.to)) continue;
    total++;
    const s = q.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    amountByStatus[s] = (amountByStatus[s] ?? 0) + (q.total ?? 0);
    totalAmount += q.total ?? 0;
  }
  return {
    total,
    totalAmount: Math.round(totalAmount * 100) / 100,
    byStatus,
    amountByStatus: Object.fromEntries(
      Object.entries(amountByStatus).map(([k, v]) => [
        k,
        Math.round(v * 100) / 100,
      ]),
    ),
  };
}

async function collectMeetingStats(
  filters: AnalyticsFilters,
): Promise<MeetingStats> {
  const meetings = await getMeetingService().list(
    filters.project ? { project: filters.project } : {},
  );
  const byProject: Record<string, number> = {};
  for (const m of meetings) {
    if (!inDateRange(m.date, filters.from, filters.to)) continue;
    const p = m.project ?? "Unassigned";
    byProject[p] = (byProject[p] ?? 0) + 1;
  }
  return { total: meetings.length, byProject };
}

async function collectCustomerStats(
  _filters: AnalyticsFilters,
): Promise<CustomerStats> {
  const customers = await getCustomerService().list();
  return { total: customers.length };
}

async function collectNoteStats(
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

export async function getProjectAnalytics(
  filters: AnalyticsFilters = {},
): Promise<AnalyticsData> {
  const [
    tasks,
    goals,
    milestones,
    timeEntries,
    capacity,
    invoices,
    quotes,
    meetings,
    customers,
    notes,
  ] = await Promise.all([
    collectTaskStats(filters),
    collectGoalStats(filters),
    collectMilestoneStats(filters),
    collectTimeEntryStats(filters),
    collectCapacityStats(filters),
    collectInvoiceStats(filters),
    collectQuoteStats(filters),
    collectMeetingStats(filters),
    collectCustomerStats(filters),
    collectNoteStats(filters),
  ]);

  return {
    filters,
    tasks,
    goals,
    milestones,
    timeEntries,
    capacity,
    invoices,
    quotes,
    meetings,
    customers,
    notes,
    generatedAt: new Date().toISOString(),
  };
}

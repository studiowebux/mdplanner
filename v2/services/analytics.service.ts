// Analytics aggregation service — reads from domain services, no storage of its own.

import {
  getCapacityPlanService,
  getCustomerService,
  getDealService,
  getFinanceService,
  getGoalService,
  getHabitService,
  getInvestorService,
  getInvoiceService,
  getJournalService,
  getMeetingService,
  getMilestoneService,
  getNoteService,
  getQuoteService,
  getReflectionService,
  getTaskService,
} from "../singletons/services.ts";
import type {
  AnalyticsData,
  AnalyticsFilters,
  CapacityPlanStats,
  CustomerStats,
  DealStats,
  FinanceStats,
  GoalStats,
  HabitStats,
  InvestorStats,
  InvoiceStats,
  JournalStats,
  MeetingStats,
  MilestoneStats,
  NoteStats,
  QuoteStats,
  ReflectionStats,
  TaskStats,
  TimeEntryStats,
} from "../types/analytics.types.ts";
import { defaultScope, type UserScope } from "../utils/actor.ts";

// Hours-per-day line chart window (last N calendar days, anchored to filters.to).
const HOURS_PER_DAY_WINDOW = 30;
// Revenue-per-month line chart window (last N calendar months, anchored to filters.to).
const REVENUE_MONTH_WINDOW = 12;
const REFLECTION_MONTH_WINDOW = 12;
const FINANCE_MONTH_WINDOW = 6;
const MEETING_WEEK_WINDOW = 12;
const JOURNAL_DAY_WINDOW = 90;

// Monday (UTC) of the week containing `d`, as YYYY-MM-DD.
function weekStartKey(d: Date): string {
  const monday = new Date(d);
  const dow = (monday.getUTCDay() + 6) % 7; // 0=Mon
  monday.setUTCDate(monday.getUTCDate() - dow);
  return monday.toISOString().slice(0, 10);
}

// Build a 0-filled weekly series (oldest first) of `window` weeks ending at the
// week containing `anchorTo` (or today), reading counts from `byWeek` keyed by
// the Monday YYYY-MM-DD.
function weeklySeries(
  byWeek: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ weekStart: string; count: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  const dow = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - dow); // Monday of anchor week
  const series: Array<{ weekStart: string; count: number }> = [];
  for (let i = 0; i < window; i++) {
    const key = cursor.toISOString().slice(0, 10);
    series.unshift({ weekStart: key, count: byWeek[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return series;
}

// Build a 0-filled daily series (oldest first) of `window` days ending at
// `anchorTo` (or today), reading counts from `byDay` keyed by YYYY-MM-DD.
function dailySeries(
  byDay: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ date: string; count: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  const series: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < window; i++) {
    const key = cursor.toISOString().slice(0, 10);
    series.unshift({ date: key, count: byDay[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return series;
}

// Build a 0-filled monthly series (oldest first) of `window` months ending at
// `anchorTo` (YYYY-MM-DD) or today, reading summed values from `byMonth` keyed
// by YYYY-MM. Cursor is pinned to the first of the month (UTC) to avoid
// end-of-month rollover when stepping back.
function monthlySeries(
  byMonth: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ month: string; amount: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  cursor.setUTCDate(1);
  const series: Array<{ month: string; amount: number }> = [];
  for (let i = 0; i < window; i++) {
    const month = cursor.toISOString().slice(0, 7); // YYYY-MM
    series.unshift({
      month,
      amount: Math.round((byMonth[month] ?? 0) * 100) / 100,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return series;
}

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
  const byMonth: Record<string, number> = {};
  let total = 0;
  let totalAmount = 0;
  for (const inv of invoices) {
    if (!inDateRange(inv.createdAt, filters.from, filters.to)) continue;
    total++;
    const s = inv.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    amountByStatus[s] = (amountByStatus[s] ?? 0) + (inv.total ?? 0);
    totalAmount += inv.total ?? 0;
    const month = inv.createdAt.slice(0, 7); // YYYY-MM (creation = revenue date)
    byMonth[month] = (byMonth[month] ?? 0) + (inv.total ?? 0);
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
    revenueByMonth: monthlySeries(byMonth, REVENUE_MONTH_WINDOW, filters.to),
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

async function collectInvestorStats(
  _filters: AnalyticsFilters,
): Promise<InvestorStats> {
  const investors = await getInvestorService().list();
  const byStatus: Record<string, number> = {};
  const targetAmountByStatus: Record<string, number> = {};
  let totalTargetAmount = 0;
  for (const inv of investors) {
    const s = inv.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    targetAmountByStatus[s] = (targetAmountByStatus[s] ?? 0) +
      (inv.amountTarget ?? 0);
    if (inv.status !== "passed") {
      totalTargetAmount += inv.amountTarget ?? 0;
    }
  }
  return {
    total: investors.length,
    byStatus,
    totalTargetAmount: Math.round(totalTargetAmount * 100) / 100,
    targetAmountByStatus: Object.fromEntries(
      Object.entries(targetAmountByStatus).map(([k, v]) => [
        k,
        Math.round(v * 100) / 100,
      ]),
    ),
  };
}

async function collectFinanceStats(
  _filters: AnalyticsFilters,
): Promise<FinanceStats> {
  const entries = await getFinanceService().list();
  let totalIncome = 0;
  let totalExpenses = 0;
  const byType: Record<string, number> = {};
  const incomeByMonth: Record<string, number> = {};
  const expensesByMonth: Record<string, number> = {};
  for (const f of entries) {
    byType[f.type] = (byType[f.type] ?? 0) + 1;
    if (f.type === "income") {
      totalIncome += f.amount;
    } else {
      totalExpenses += f.amount;
    }
    if (f.date) {
      const month = f.date.slice(0, 7);
      if (f.type === "income") {
        incomeByMonth[month] = (incomeByMonth[month] ?? 0) + f.amount;
      } else {
        expensesByMonth[month] = (expensesByMonth[month] ?? 0) + f.amount;
      }
    }
  }
  const income = monthlySeries(incomeByMonth, FINANCE_MONTH_WINDOW);
  const expenses = monthlySeries(expensesByMonth, FINANCE_MONTH_WINDOW);
  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    byType,
    byMonth: income.map((d, i) => ({
      month: d.month,
      income: d.amount,
      expenses: expenses[i].amount,
    })),
  };
}

async function collectDealStats(
  _filters: AnalyticsFilters,
): Promise<DealStats> {
  const deals = await getDealService().list();
  const byStage: Record<string, number> = {};
  let totalValue = 0;
  for (const d of deals) {
    const s = d.stage ?? "unknown";
    byStage[s] = (byStage[s] ?? 0) + 1;
    totalValue += d.value ?? 0;
  }
  return {
    total: deals.length,
    byStage,
    totalValue: Math.round(totalValue * 100) / 100,
  };
}

async function collectHabitStats(
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

async function collectJournalStats(
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

async function collectReflectionStats(
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

export async function getProjectAnalytics(
  filters: AnalyticsFilters = {},
  scope?: UserScope,
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
    investors,
    finances,
    deals,
    habits,
    journal,
    reflections,
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
    collectInvestorStats(filters),
    collectFinanceStats(filters),
    collectDealStats(filters),
    collectHabitStats(filters, scope),
    collectJournalStats(filters),
    collectReflectionStats(filters),
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
    investors,
    finances,
    deals,
    habits,
    journal,
    reflections,
    generatedAt: new Date().toISOString(),
  };
}

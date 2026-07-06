// Shared analytics render fixtures — a fully-populated payload (every section
// non-empty, exercising charts + drilldowns) and an all-empty payload
// (exercising the EmptyState path + stat-only customers section). Consumed by
// analytics-render_test.ts and the one-off before/after equivalence check for
// the AnalyticsSection decomposition (sh7n).

import type { AnalyticsData } from "../../src/types/analytics.types.ts";

const filters = {};

export const fullData: AnalyticsData = {
  filters,
  generatedAt: "2026-06-05T00:00:00.000Z",
  tasks: {
    total: 12,
    bySection: { Todo: 5, "In Progress": 3, Done: 4 },
    byPriority: { 1: 2, 2: 4, 3: 6 },
    byProject: { "MD Planner": 8, "Mobile App": 4 },
  },
  goals: {
    total: 4,
    byStatus: { active: 3, done: 1 },
    byType: { okr: 2, smart: 2 },
  },
  milestones: {
    total: 2,
    milestones: [
      { id: "m1", name: "v2.0.0", taskCount: 10, doneCount: 7, progress: 70 },
      { id: "m2", name: "v2.1.0", taskCount: 4, doneCount: 1, progress: 25 },
    ],
  },
  timeEntries: {
    totalHours: 42,
    entryCount: 9,
    byPerson: { Tommy: 30, Claude: 12 },
    byProject: { "MD Planner": 28, "Mobile App": 14 },
    hoursPerDay: [
      { date: "2026-06-01", hours: 6 },
      { date: "2026-06-02", hours: 8 },
    ],
  },
  capacity: {
    plans: [
      {
        id: "c1",
        name: "Q2 Plan",
        budgetHours: 160,
        allocatedHours: 200,
        utilizationPct: 125,
      },
      {
        id: "c2",
        name: "Q3 Plan",
        budgetHours: null,
        allocatedHours: 40,
        utilizationPct: null,
      },
    ],
  },
  invoices: {
    total: 3,
    totalAmount: 9500,
    byStatus: { paid: 2, sent: 1 },
    amountByStatus: { paid: 7000, sent: 2500 },
    revenueByMonth: [
      { month: "2026-05", amount: 4000 },
      { month: "2026-06", amount: 5500 },
    ],
  },
  quotes: {
    total: 2,
    totalAmount: 6000,
    byStatus: { draft: 1, accepted: 1 },
    amountByStatus: { draft: 2000, accepted: 4000 },
  },
  meetings: {
    total: 5,
    byProject: { "MD Planner": 3, "Mobile App": 2 },
    byWeek: [
      { weekStart: "2026-05-25", count: 2 },
      { weekStart: "2026-06-01", count: 3 },
    ],
  },
  customers: { total: 7 },
  notes: {
    total: 20,
    byType: { decision: 8, architecture: 7, progress: 5 },
    byProject: { "MD Planner": 15, "Mobile App": 5 },
  },
  investors: {
    total: 3,
    byStatus: { contacted: 2, committed: 1 },
    totalTargetAmount: 500000,
    targetAmountByStatus: { contacted: 300000, committed: 200000 },
  },
  finances: {
    totalIncome: 12000,
    totalExpenses: 7000,
    balance: 5000,
    byType: { income: 12000, expense: 7000 },
    byMonth: [
      { month: "2026-05", income: 6000, expenses: 3000 },
      { month: "2026-06", income: 6000, expenses: 4000 },
    ],
  },
  deals: {
    total: 4,
    byStage: { lead: 2, qualified: 1, proposal: 1 },
    totalValue: 85000,
  },
  habits: {
    total: 2,
    completionRateThisMonth: 80,
    currentMonth: [
      { habitId: "h1", habitName: "Read", completions: [true, false, true] },
      { habitId: "h2", habitName: "Run", completions: [false, true, true] },
    ],
  },
  journal: {
    total: 30,
    thisMonth: 6,
    thisWeek: 2,
    streak: 4,
    last90Days: [
      { date: "2026-06-03", count: 0 },
      { date: "2026-06-04", count: 1 },
      { date: "2026-06-05", count: 3 },
    ],
  },
  reflections: {
    total: 6,
    thisMonth: 2,
    byMonth: [
      { month: "2026-05", count: 4 },
      { month: "2026-06", count: 2 },
    ],
  },
};

export const emptyData: AnalyticsData = {
  filters,
  generatedAt: "2026-06-05T00:00:00.000Z",
  tasks: { total: 0, bySection: {}, byPriority: {}, byProject: {} },
  goals: { total: 0, byStatus: {}, byType: {} },
  milestones: { total: 0, milestones: [] },
  timeEntries: {
    totalHours: 0,
    entryCount: 0,
    byPerson: {},
    byProject: {},
    hoursPerDay: [],
  },
  capacity: { plans: [] },
  invoices: {
    total: 0,
    totalAmount: 0,
    byStatus: {},
    amountByStatus: {},
    revenueByMonth: [],
  },
  quotes: { total: 0, totalAmount: 0, byStatus: {}, amountByStatus: {} },
  meetings: { total: 0, byProject: {}, byWeek: [] },
  customers: { total: 0 },
  notes: { total: 0, byType: {}, byProject: {} },
  investors: {
    total: 0,
    byStatus: {},
    totalTargetAmount: 0,
    targetAmountByStatus: {},
  },
  finances: {
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    byType: {},
    byMonth: [],
  },
  deals: { total: 0, byStage: {}, totalValue: 0 },
  habits: { total: 0, completionRateThisMonth: null, currentMonth: [] },
  journal: { total: 0, thisMonth: 0, thisWeek: 0, streak: 0, last90Days: [] },
  reflections: { total: 0, thisMonth: 0, byMonth: [] },
};

export const fixtureProps = {
  customers: [{ id: "cust1", label: "Acme" }],
  projects: [{ id: "MD Planner", label: "MD Planner" }],
  people: [{ id: "Tommy", label: "Tommy" }],
  hiddenSections: [] as string[],
};

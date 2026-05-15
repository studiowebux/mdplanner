// Analytics types — AnalyticsFilters + AnalyticsData with per-domain sections.

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const AnalyticsFiltersSchema = z.object({
  customer: z.string().optional().openapi({
    param: { name: "customer", in: "query" },
    description: "Filter by customer ID",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project (portfolio item title)",
  }),
  person: z.string().optional().openapi({
    param: { name: "person", in: "query" },
    description: "Filter by person name",
  }),
  from: z.string().optional().openapi({
    param: { name: "from", in: "query" },
    description: "Start date (ISO, inclusive)",
  }),
  to: z.string().optional().openapi({
    param: { name: "to", in: "query" },
    description: "End date (ISO, inclusive)",
  }),
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;

// ---------------------------------------------------------------------------
// Per-section result types
// ---------------------------------------------------------------------------

export interface TaskStats {
  total: number;
  bySection: Record<string, number>;
  byPriority: Record<number, number>;
  byProject: Record<string, number>;
}

export interface GoalStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface MilestoneProgress {
  id: string;
  name: string;
  taskCount: number;
  doneCount: number;
  progress: number;
}

export interface MilestoneStats {
  total: number;
  milestones: MilestoneProgress[];
}

export interface TimeEntryStats {
  totalHours: number;
  byPerson: Record<string, number>;
  byProject: Record<string, number>;
  entryCount: number;
}

export interface CapacityPlanStats {
  plans: Array<{
    id: string;
    name: string;
    budgetHours: number | null;
    allocatedHours: number;
    utilizationPct: number | null;
  }>;
}

export interface InvoiceStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  amountByStatus: Record<string, number>;
}

export interface QuoteStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  amountByStatus: Record<string, number>;
}

export interface MeetingStats {
  total: number;
  byProject: Record<string, number>;
}

export interface CustomerStats {
  total: number;
}

export interface NoteStats {
  total: number;
  byType: Record<string, number>;
  byProject: Record<string, number>;
}

export interface InvestorStats {
  total: number;
  byStatus: Record<string, number>;
  totalTargetAmount: number;
}

export interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byType: Record<string, number>;
}

export interface DealStats {
  total: number;
  byStage: Record<string, number>;
  totalValue: number;
}

export interface HabitStats {
  total: number;
  completionRateThisMonth: number | null;
}

export interface JournalStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  streak: number;
}

export interface ReflectionStats {
  total: number;
  thisMonth: number;
}

// ---------------------------------------------------------------------------
// Top-level payload
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  filters: AnalyticsFilters;
  tasks: TaskStats;
  goals: GoalStats;
  milestones: MilestoneStats;
  timeEntries: TimeEntryStats;
  capacity: CapacityPlanStats;
  invoices: InvoiceStats;
  quotes: QuoteStats;
  meetings: MeetingStats;
  customers: CustomerStats;
  notes: NoteStats;
  investors: InvestorStats;
  finances: FinanceStats;
  deals: DealStats;
  habits: HabitStats;
  journal: JournalStats;
  reflections: ReflectionStats;
  generatedAt: string;
}

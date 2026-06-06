// Analytics aggregation service — reads from domain services, no storage of its
// own. The per-domain collectors live in ./analytics/{work,finance,engagement}.ts
// (sharing date-series helpers in ./analytics/series.ts); this orchestrator
// fans them out in parallel and assembles the AnalyticsData response.

import type {
  AnalyticsData,
  AnalyticsFilters,
} from "../types/analytics.types.ts";
import { type UserScope } from "../utils/actor.ts";
import {
  collectCapacityStats,
  collectGoalStats,
  collectMilestoneStats,
  collectTaskStats,
  collectTimeEntryStats,
} from "./analytics/work.ts";
import {
  collectCustomerStats,
  collectDealStats,
  collectFinanceStats,
  collectInvestorStats,
  collectInvoiceStats,
  collectQuoteStats,
} from "./analytics/finance.ts";
import {
  collectHabitStats,
  collectJournalStats,
  collectMeetingStats,
  collectNoteStats,
  collectReflectionStats,
} from "./analytics/engagement.ts";

/**
 * Aggregate every analytics dimension (work, finance, engagement) into one
 * AnalyticsData payload. Honors the optional date/project/customer/person
 * filters; `scope` selects the acting user for per-user stats (habits).
 */
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

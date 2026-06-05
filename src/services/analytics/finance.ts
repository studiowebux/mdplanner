// Analytics collectors — revenue/CRM domain: invoices, quotes, customers,
// investors, finance entries, deals.

import {
  getCustomerService,
  getDealService,
  getFinanceService,
  getInvestorService,
  getInvoiceService,
  getQuoteService,
} from "../../singletons/services.ts";
import type {
  AnalyticsFilters,
  CustomerStats,
  DealStats,
  FinanceStats,
  InvestorStats,
  InvoiceStats,
  QuoteStats,
} from "../../types/analytics.types.ts";
import { inDateRange, monthlySeries } from "./series.ts";

// Revenue-per-month line chart window (last N calendar months, anchored to filters.to).
const REVENUE_MONTH_WINDOW = 12;
const FINANCE_MONTH_WINDOW = 6;

export async function collectInvoiceStats(
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

export async function collectQuoteStats(
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

export async function collectCustomerStats(
  _filters: AnalyticsFilters,
): Promise<CustomerStats> {
  const customers = await getCustomerService().list();
  return { total: customers.length };
}

export async function collectInvestorStats(
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

export async function collectFinanceStats(
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

export async function collectDealStats(
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

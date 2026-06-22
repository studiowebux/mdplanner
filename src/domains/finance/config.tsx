// Finance domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateFinance,
  Finance,
  ListFinanceOptions,
  UpdateFinance,
} from "../../types/finance.types.ts";
import { FINANCE_TYPES } from "../../types/finance.types.ts";
import { getFinanceService } from "../../singletons/services.ts";
import { FinanceService } from "../../services/finance.service.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { sumByCurrency } from "../../utils/money.ts";
import {
  FINANCE_FORM_FIELDS,
  FINANCE_TABLE_COLUMNS,
  FINANCE_TYPE_OPTIONS,
  financeMapRows,
  financeToRow,
} from "./constants.tsx";
import { FinanceSummaryBanner } from "../../views/finances/components/finance-summary.tsx";
import { FinanceChart } from "../../views/finances/components/finance-chart.tsx";
import { FinanceByTag } from "../../views/finances/components/finance-by-tag.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

/** Read the current request's filter query into ListFinanceOptions so the
 *  summary banner and any other top-of-page aggregations see exactly the same
 *  filtered set the list/chart/by-tag views see. */
function readFinanceFilterOpts(c: {
  req: { query: (key: string) => string | undefined };
}): ListFinanceOptions {
  const q = c.req.query("q") ?? undefined;
  const tag = c.req.query("tag") ?? undefined;
  const from = c.req.query("from") ?? undefined;
  const to = c.req.query("to") ?? undefined;
  const rawType = c.req.query("type");
  const type = rawType && (FINANCE_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ListFinanceOptions["type"])
    : undefined;
  return { q, type, tag, from, to };
}

export const financeConfig: DomainConfig<
  Finance,
  CreateFinance,
  UpdateFinance
> = {
  name: "finances",
  singular: "Finance Entry",
  plural: "Finance Entries",
  path: "/finances",
  ssePrefix: "finance",
  styles: ["/css/views/finances.css"],
  emptyMessage: "No finance entries yet. Create one to get started.",
  defaultView: "table",
  hideGridView: true,

  stateKeys: ["view", "type", "tag", "q", "sort", "order", "from", "to"],
  columns: FINANCE_TABLE_COLUMNS,
  formFields: FINANCE_FORM_FIELDS,
  // `description` (rendered as "Notes") is edited in-place on the detail page.
  inlineEditFields: ["description"],

  filters: [
    {
      name: "type",
      label: "All types",
      options: FINANCE_TYPE_OPTIONS,
    },
  ],

  dateRangeFilter: {
    field: "date",
    fromKey: "from",
    toKey: "to",
    fromLabel: "From",
    toLabel: "To",
  },

  toRow: financeToRow,
  mapRows: financeMapRows,

  parseCreate: (body) =>
    parseFormBody(FINANCE_FORM_FIELDS, body) as CreateFinance,

  parseUpdate: (body) =>
    parseFormBody(FINANCE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateFinance>,

  getService: () => getFinanceService(),

  topSlot: async (c) => {
    const opts = readFinanceFilterOpts(c);
    const filtered = await getFinanceService().list(opts);
    let totalIncome = 0;
    let totalExpense = 0;
    for (const f of filtered) {
      if (f.type === "income") totalIncome += f.amount;
      else totalExpense += f.amount;
    }
    const summary = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byTag: FinanceService.aggregateByTag(filtered),
    };
    // Currency-aware: don't present a single blended total when entries span
    // more than one currency (formatCurrency renders one project currency).
    const income = filtered.filter((f) => f.type === "income");
    const expense = filtered.filter((f) => f.type === "expense");
    const incomeTotals = sumByCurrency(income);
    const expenseTotals = sumByCurrency(expense);
    const balanceTotals = sumByCurrency(
      filtered.map((f) => ({
        amount: f.type === "income" ? f.amount : -f.amount,
        currency: f.currency,
      })),
    );
    return (
      <FinanceSummaryBanner
        summary={summary}
        incomeTotals={incomeTotals}
        expenseTotals={expenseTotals}
        balanceTotals={balanceTotals}
      />
    );
  },

  searchPredicate: createSearchPredicate<Finance>([
    { type: "string", get: (f) => f.title },
    { type: "string", get: (f) => f.description },
    { type: "array", get: (f) => f.tags },
  ]),

  extraViewModes: [
    { key: "by-tag", label: "By Category" },
    { key: "chart", label: "Chart" },
  ],

  customViewRenderer: (view, _state, items) => {
    if (view === "by-tag") {
      return Promise.resolve(<FinanceByTag items={items} />);
    }
    const monthly = FinanceService.aggregateMonthly(items);
    const byTag = FinanceService.aggregateByTag(items);
    return Promise.resolve(<FinanceChart monthly={monthly} byTag={byTag} />);
  },
};

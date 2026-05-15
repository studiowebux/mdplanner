// Finance domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateFinance,
  Finance,
  UpdateFinance,
} from "../../types/finance.types.ts";
import { FINANCE_TYPE_LABELS } from "../../types/finance.types.ts";
import { getFinanceService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  FINANCE_FORM_FIELDS,
  FINANCE_TABLE_COLUMNS,
  FINANCE_TYPE_OPTIONS,
  financeToRow,
} from "./constants.tsx";
import { FinanceCard } from "../../views/components/finance-card.tsx";
import { FinanceSummaryBanner } from "../../views/finances/components/finance-summary.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

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

  stateKeys: ["view", "type", "tag", "q", "sort", "order", "from", "to"],
  columns: FINANCE_TABLE_COLUMNS,
  formFields: FINANCE_FORM_FIELDS,

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

  Card: ({ item, q }) => <FinanceCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(FINANCE_FORM_FIELDS, body) as CreateFinance,

  parseUpdate: (body) =>
    parseFormBody(FINANCE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateFinance>,

  getService: () => getFinanceService(),

  topSlot: async () => {
    const summary = await getFinanceService().getSummary();
    return <FinanceSummaryBanner summary={summary} />;
  },

  searchPredicate: createSearchPredicate<Finance>([
    { type: "string", get: (f) => f.title },
    { type: "string", get: (f) => f.description },
    { type: "array", get: (f) => f.tags },
  ]),
};

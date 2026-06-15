import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { DomainFilterState } from "../../factories/domain.types.ts";
import type { Finance } from "../../types/finance.types.ts";
import {
  FINANCE_TYPE_LABELS,
  FINANCE_TYPES,
} from "../../types/finance.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { formatDate } from "../../utils/time.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { FinanceService } from "../../services/finance.service.ts";

export const FINANCE_TYPE_OPTIONS = FINANCE_TYPES.map((t) => ({
  value: t,
  label: FINANCE_TYPE_LABELS[t],
}));

export const FINANCE_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  income: "success",
  expense: "error",
};

const actionBtns = createActionBtns("finances", "finances-form-container", {
  nameField: "title",
});

export const FINANCE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/finances/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (v) => v ? statusBadgeRenderer(FINANCE_TYPE_VARIANTS)(v) : "",
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
  },
  {
    key: "tags",
    label: "Tags",
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (v) => v ? formatDate(v as string) : "",
  },
  {
    key: "runningBalance",
    label: "Running Balance",
    sortable: false,
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const FINANCE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    options: FINANCE_TYPE_OPTIONS,
  },
  {
    type: "money",
    name: "amount",
    label: "Amount",
  },
  {
    type: "text",
    name: "currency",
    label: "Currency",
    placeholder: "e.g. CAD",
  },
  {
    type: "date",
    name: "date",
    label: "Date",
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "e.g. saas, salary, hosting...",
  },
  { type: "textarea", name: "description", label: "Notes", rows: 3 },
];

export function financeToRow(f: Finance): Record<string, unknown> {
  return {
    id: f.id,
    title: f.title,
    type: f.type,
    amount: formatCurrency(f.amount, { decimals: 2 }),
    tags: (f.tags ?? []).join(", "),
    date: f.date ?? "",
    runningBalance: "",
    updated: f.updatedAt,
  };
}

/**
 * Batch row mapper used by the factory `mapRows` hook. Computes a running
 * balance over the date-asc projection of the visible items, then maps in the
 * user's current sort order — each row carries its date-ordered cumulative
 * balance regardless of how the table is sorted.
 *
 * NOTE: Finance has no pagination today (`pageSize` unset), so `items` is the
 * complete filtered set and the cumulative is correct end-to-end. If
 * pagination is ever added, this becomes a page-local cumulative — see the
 * note on `DomainConfig.mapRows`.
 */
export function financeMapRows(
  items: Finance[],
  state: DomainFilterState,
): Array<Record<string, unknown>> {
  const balanceById = FinanceService.computeRunningBalance(items);
  return items.map((f) => ({
    ...financeToRow(f),
    runningBalance: formatCurrency(balanceById.get(f.id) ?? 0, { decimals: 2 }),
    _q: state.q,
  }));
}

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
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
import { formatDate } from "../../utils/time.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";

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
    type: "number",
    name: "amount",
    label: "Amount",
    min: 0,
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
    amount: f.amount.toLocaleString(),
    tags: (f.tags ?? []).join(", "),
    date: f.date ?? "",
    updated: f.updatedAt,
  };
}

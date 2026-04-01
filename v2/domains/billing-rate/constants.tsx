import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { BillingRate } from "../../types/billing-rate.types.ts";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

export const UNIT_LABELS: Record<string, string> = {
  h: "Hourly",
  d: "Daily",
  unit: "Per unit",
  mo: "Monthly",
  fixed: "Fixed",
};

/** Format a rate with its unit (e.g. "$150.00/h"). Uses project locale/currency. */
export function formatRate(rate: number, unit: string): string {
  const formatted = formatCurrency(rate) || "$0";
  return unit === "fixed" ? formatted : `${formatted}/${unit}`;
}

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/billing-rates/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/billing-rates/${row.id}/edit`}
      hx-target="#billing-rates-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/billing-rates/${row.id}`}
      hx-confirm={`Delete "${row.name}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

export const BILLING_RATE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/billing-rates/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "rateFormatted",
    label: "Rate",
    sortable: true,
  },
  {
    key: "unitLabel",
    label: "Unit",
    sortable: true,
  },
  {
    key: "assignee",
    label: "Assignee",
    sortable: true,
  },
  {
    key: "isDefault",
    label: "Default",
    sortable: true,
    render: (v) => v ? <span class="badge badge--green">Default</span> : "",
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const BILLING_RATE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
    placeholder: "e.g. Senior Dev",
  },
  {
    type: "number",
    name: "rate",
    label: "Rate",
    required: true,
  },
  {
    type: "select",
    name: "unit",
    label: "Unit",
    required: true,
    options: [
      { value: "h", label: "Hourly (h)" },
      { value: "d", label: "Daily (d)" },
      { value: "unit", label: "Per unit" },
      { value: "mo", label: "Monthly (mo)" },
      { value: "fixed", label: "Fixed" },
    ],
  },
  {
    type: "text",
    name: "currency",
    label: "Currency",
    placeholder: "CAD",
  },
  {
    type: "text",
    name: "assignee",
    label: "Assignee",
    placeholder: "Person ID (optional)",
  },
  {
    type: "boolean",
    name: "isDefault",
    label: "Default rate",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

export function billingRateToRow(r: BillingRate): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    rateFormatted: formatRate(r.rate, r.unit),
    unitLabel: UNIT_LABELS[r.unit] ?? r.unit,
    assignee: r.assignee ?? "",
    isDefault: r.isDefault ?? false,
  };
}

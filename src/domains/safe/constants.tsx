import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Safe } from "../../types/safe.types.ts";
import { SAFE_STATUSES, SAFE_TYPES } from "../../types/safe.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Status → badge variant
// ---------------------------------------------------------------------------

export const SAFE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  signed: "success",
  converted: "teal",
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("safe", "safe-form-container");

export const SAFE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "investor",
    label: "Investor",
    sortable: true,
    render: (v, row) => (
      <a href={`/safe/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (v) => `$${Number(v).toLocaleString()}`,
  },
  {
    key: "valuation_cap",
    label: "Cap",
    sortable: true,
    render: (v) => (Number(v) > 0 ? `$${Number(v).toLocaleString()}` : "—"),
  },
  {
    key: "discount",
    label: "Discount",
    sortable: true,
    render: (v) => (Number(v) > 0 ? `${v}%` : "—"),
  },
  { key: "type", label: "Type", sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(SAFE_STATUS_VARIANTS),
  },
  { key: "date", label: "Date", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const SAFE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "investor",
    label: "Investor",
    required: true,
    maxLength: 200,
  },
  {
    type: "money",
    name: "amount",
    label: "Amount (USD)",
    required: true,
  },
  {
    type: "money",
    name: "valuation_cap",
    label: "Valuation Cap (USD)",
  },
  {
    type: "number",
    name: "discount",
    label: "Discount (%)",
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    required: true,
    options: SAFE_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    required: true,
    options: SAFE_STATUSES.map((s) => ({ value: s, label: s })),
  },
  {
    type: "date",
    name: "date",
    label: "Date",
    required: true,
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 3,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function safeToRow(s: Safe): Record<string, unknown> {
  return {
    id: s.id,
    investor: s.investor,
    amount: s.amount,
    valuation_cap: s.valuation_cap,
    discount: s.discount,
    type: s.type,
    status: s.status,
    date: s.date,
  };
}

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Payment } from "../../types/payment.types.ts";
import { PAYMENT_METHODS } from "../../types/payment.types.ts";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Method badges
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_VARIANTS: Record<string, BadgeVariant> = {
  bank: "info",
  card: "accent",
  cash: "success",
  cheque: "warning",
  other: "neutral",
};

// ---------------------------------------------------------------------------
// Method options (derived from const array)
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: m.charAt(0).toUpperCase() + m.slice(1),
}));

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/payments/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/payments/${row.id}/edit`}
      hx-target="#payments-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/payments/${row.id}`}
      hx-confirm="Delete this payment? This cannot be undone."
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const PAYMENT_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (v, row) => (
      <a href={`/payments/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "invoiceName",
    label: "Invoice",
    sortable: true,
    render: (v, row) =>
      row.invoiceId
        ? <a href={`/invoices/${row.invoiceId}`}>{String(v)}</a>
        : "",
  },
  {
    key: "amountFormatted",
    label: "Amount",
    sortable: true,
  },
  {
    key: "method",
    label: "Method",
    sortable: true,
    render: (v) => {
      if (!v) return "";
      const variant = PAYMENT_METHOD_VARIANTS[String(v)] ?? "neutral";
      return <span class={`badge badge--${variant}`}>{String(v)}</span>;
    },
  },
  {
    key: "reference",
    label: "Reference",
    sortable: true,
    render: (v, row) =>
      v ? <Highlight text={String(v)} q={row._q as string} /> : "",
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const PAYMENT_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "invoiceId",
    label: "Invoice ID",
    required: true,
    placeholder: "invoice_...",
  },
  {
    type: "number",
    name: "amount",
    label: "Amount",
    required: true,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
    required: true,
  },
  {
    type: "select",
    name: "method",
    label: "Method",
    options: PAYMENT_METHOD_OPTIONS,
  },
  {
    type: "text",
    name: "reference",
    label: "Reference",
    placeholder: "Transaction ID, cheque #",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 3 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function paymentToRow(
  p: Payment,
  invoiceNames?: Map<string, string>,
): Record<string, unknown> {
  return {
    id: p.id,
    date: p.date,
    invoiceId: p.invoiceId,
    invoiceName: invoiceNames?.get(p.invoiceId) ?? p.invoiceId,
    amountFormatted: formatCurrency(p.amount) || "$0",
    method: p.method ?? "",
    reference: p.reference ?? "",
  };
}

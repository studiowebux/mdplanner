import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { BASE_LINE_ITEM_FIELDS } from "../billing/constants.ts";
import type { Invoice } from "../../types/invoice.types.ts";
import { INVOICE_STATUSES } from "../../types/invoice.types.ts";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

export const INVOICE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "error",
  cancelled: "neutral",
};

// ---------------------------------------------------------------------------
// Status options (derived from const array)
// ---------------------------------------------------------------------------

export const INVOICE_STATUS_OPTIONS = INVOICE_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

// ---------------------------------------------------------------------------
// Payment terms
// ---------------------------------------------------------------------------

export const PAYMENT_TERMS_OPTIONS = [
  { value: "Due on receipt", label: "Due on receipt" },
  { value: "NET 15", label: "NET 15" },
  { value: "NET 30", label: "NET 30" },
  { value: "NET 45", label: "NET 45" },
  { value: "NET 60", label: "NET 60" },
];

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/invoices/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/invoices/${row.id}/edit`}
      hx-target="#invoices-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/invoices/${row.id}`}
      hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const INVOICE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "number",
    label: "Number",
    sortable: true,
    render: (v, row) => (
      <a href={`/invoices/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  {
    key: "customerName",
    label: "Customer",
    sortable: true,
    render: (v, row) => <a href={`/customers/${row.customerId}`}>{String(v)}
    </a>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(INVOICE_STATUS_VARIANTS),
  },
  {
    key: "totalFormatted",
    label: "Total",
    sortable: true,
  },
  {
    key: "paidFormatted",
    label: "Paid",
    sortable: true,
  },
  {
    key: "dueDate",
    label: "Due",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const INVOICE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "text",
    name: "customerId",
    label: "Customer ID",
    required: true,
    placeholder: "customer_...",
  },
  {
    type: "text",
    name: "quoteId",
    label: "Quote ID",
    placeholder: "quote_... (optional)",
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: INVOICE_STATUS_OPTIONS,
  },
  {
    type: "text",
    name: "currency",
    label: "Currency",
    placeholder: "CAD",
  },
  {
    type: "date",
    name: "dueDate",
    label: "Due Date",
  },
  {
    type: "select",
    name: "paymentTerms",
    label: "Payment Terms",
    options: PAYMENT_TERMS_OPTIONS,
  },
  {
    type: "number",
    name: "taxRate",
    label: "Tax Rate (%)",
  },
  {
    type: "array-table",
    name: "lineItems",
    label: "Line Item",
    section: "invoice_line_items",
    addLabel: "Add line item",
    itemFields: BASE_LINE_ITEM_FIELDS,
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
  { type: "textarea", name: "footer", label: "Footer", rows: 3 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function invoiceToRow(
  inv: Invoice,
  displayStatus?: string,
  customerNames?: Map<string, string>,
): Record<string, unknown> {
  return {
    id: inv.id,
    number: inv.number,
    title: inv.title,
    customerId: inv.customerId,
    customerName: customerNames?.get(inv.customerId) ?? inv.customerId,
    status: displayStatus ?? inv.status,
    totalFormatted: formatCurrency(inv.total) || "$0",
    paidFormatted: formatCurrency(inv.paidAmount) || "$0",
    dueDate: inv.dueDate ?? "",
  };
}

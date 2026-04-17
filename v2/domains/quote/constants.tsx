import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { BASE_LINE_ITEM_FIELDS } from "../billing/constants.ts";
import type { Quote } from "../../types/quote.types.ts";
import { QUOTE_STATUSES } from "../../types/quote.types.ts";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

export const QUOTE_STATUS_OPTIONS = QUOTE_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export const QUOTE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "error",
};

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("quotes", "quotes-form-container");

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const QUOTE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "number",
    label: "Number",
    sortable: true,
    render: (v, row) => (
      <a href={`/quotes/${row.id}`}>
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
    render: statusBadgeRenderer(QUOTE_STATUS_VARIANTS),
  },
  {
    key: "totalFormatted",
    label: "Total",
    sortable: true,
  },
  {
    key: "expiresAt",
    label: "Expires",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const QUOTE_FORM_FIELDS: FieldDef[] = [
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
    type: "select",
    name: "status",
    label: "Status",
    options: QUOTE_STATUS_OPTIONS,
  },
  {
    type: "text",
    name: "currency",
    label: "Currency",
    placeholder: "CAD",
  },
  {
    type: "date",
    name: "expiresAt",
    label: "Expires",
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
    section: "quote_line_items",
    addLabel: "Add line item",
    itemFields: [
      ...BASE_LINE_ITEM_FIELDS,
      {
        type: "select",
        name: "optional",
        label: "Optional",
        options: [
          { value: "", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
    ],
  },
  {
    type: "array-table",
    name: "paymentSchedule",
    label: "Payment Milestone",
    section: "payment_schedule",
    addLabel: "Add milestone",
    itemFields: [
      {
        type: "text",
        name: "description",
        label: "Description",
        placeholder: "e.g. 50% deposit",
      },
      { type: "number", name: "percent", label: "%" },
      { type: "number", name: "amount", label: "Amount" },
      { type: "date", name: "dueDate", label: "Due" },
    ],
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
  { type: "textarea", name: "footer", label: "Footer", rows: 3 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function quoteToRow(
  q: Quote,
  customerNames?: Map<string, string>,
): Record<string, unknown> {
  return {
    id: q.id,
    number: q.number,
    title: q.title,
    customerId: q.customerId,
    customerName: customerNames?.get(q.customerId) ?? q.customerId,
    status: q.status,
    totalFormatted: formatCurrency(q.total) || "$0",
    expiresAt: q.expiresAt ?? "",
  };
}

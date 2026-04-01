import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Quote } from "../../types/quote.types.ts";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

export const QUOTE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "error",
};

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/quotes/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/quotes/${row.id}/edit`}
      hx-target="#quotes-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/quotes/${row.id}`}
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
    options: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
      { value: "rejected", label: "Rejected" },
    ],
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
    section: "line_items",
    addLabel: "Add line item",
    itemFields: [
      {
        type: "select",
        name: "type",
        label: "Type",
        options: [
          { value: "service", label: "Service" },
          { value: "product", label: "Product" },
          { value: "expense", label: "Expense" },
          { value: "text", label: "Text" },
        ],
      },
      {
        type: "text",
        name: "description",
        label: "Description",
        placeholder: "Line item description",
      },
      { type: "text", name: "group", label: "Group", placeholder: "Section" },
      { type: "number", name: "quantity", label: "Qty" },
      {
        type: "select",
        name: "unit",
        label: "Unit",
        options: [
          { value: "h", label: "h" },
          { value: "d", label: "d" },
          { value: "unit", label: "unit" },
          { value: "mo", label: "mo" },
          { value: "fixed", label: "fixed" },
        ],
      },
      { type: "number", name: "unitRate", label: "Rate" },
      { type: "number", name: "discount", label: "Discount" },
      {
        type: "select",
        name: "discountType",
        label: "Disc. Type",
        options: [
          { value: "percent", label: "%" },
          { value: "fixed", label: "$" },
        ],
      },
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

export function quoteToRow(q: Quote): Record<string, unknown> {
  return {
    id: q.id,
    number: q.number,
    title: q.title,
    customerName: q.customerId,
    status: q.status,
    totalFormatted: formatCurrency(q.total) || "$0",
    expiresAt: q.expiresAt ?? "",
  };
}

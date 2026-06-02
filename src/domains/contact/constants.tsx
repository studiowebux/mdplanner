import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Contact } from "../../types/contact.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";

export const CONTACT_TYPE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

export const CONTACT_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  lead: "info",
  customer: "success",
  partner: "accent",
  vendor: "warning",
  other: "neutral",
};

const actionBtns = createActionBtns("contacts", "contacts-form-container", {
  nameField: "name",
});

export const CONTACT_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/contacts/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
    render: (v) => v ? <a href={`mailto:${v}`}>{String(v)}</a> : "",
  },
  {
    key: "company",
    label: "Company",
    sortable: true,
    render: (v, row) =>
      v
        ? (
          <a href={`/companies?q=${encodeURIComponent(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (v) => (v ? statusBadgeRenderer(CONTACT_TYPE_VARIANTS)(v) : ""),
  },
  {
    key: "tags",
    label: "Tags",
  },
  {
    key: "updated",
    label: "Updated",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const CONTACT_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "text",
    name: "email",
    label: "Email",
    placeholder: "e.g. jane@example.com",
  },
  {
    type: "text",
    name: "phone",
    label: "Phone",
    placeholder: "e.g. +1-555-0100",
  },
  {
    type: "text",
    name: "role",
    label: "Role",
    placeholder: "e.g. Head of Marketing",
  },
  {
    type: "text",
    name: "company",
    label: "Company",
    placeholder: "Organization name",
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    options: CONTACT_TYPE_OPTIONS,
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Type and press Enter...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

export function contactToRow(c: Contact): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    company: c.company ?? "",
    role: c.role ?? "",
    type: c.type ?? "",
    tags: (c.tags ?? []).join(", "),
    updated: c.updatedAt,
  };
}

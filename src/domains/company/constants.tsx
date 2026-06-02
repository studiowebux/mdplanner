import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Company } from "../../types/company.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";

export const COMPANY_TYPE_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

export const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-1000", label: "201–1000" },
  { value: "1000+", label: "1000+" },
];

export const COMPANY_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  prospect: "info",
  customer: "success",
  partner: "accent",
  vendor: "warning",
  other: "neutral",
};

const actionBtns = createActionBtns("companies", "companies-form-container", {
  nameField: "name",
});

export const COMPANY_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/companies/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "industry",
    label: "Industry",
    sortable: true,
  },
  {
    key: "website",
    label: "Website",
    sortable: true,
    render: (v) =>
      v
        ? (
          <a href={String(v)} target="_blank" rel="noopener noreferrer">
            {String(v)}
          </a>
        )
        : "",
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (v) => (v ? statusBadgeRenderer(COMPANY_TYPE_VARIANTS)(v) : ""),
  },
  {
    key: "size",
    label: "Size",
    sortable: true,
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

export const COMPANY_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "text",
    name: "website",
    label: "Website",
    placeholder: "e.g. https://acme.example.com",
  },
  {
    type: "text",
    name: "industry",
    label: "Industry",
    placeholder: "e.g. SaaS",
  },
  {
    type: "select",
    name: "size",
    label: "Size",
    options: COMPANY_SIZE_OPTIONS,
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    options: COMPANY_TYPE_OPTIONS,
  },
  {
    type: "text",
    name: "phone",
    label: "Phone",
    placeholder: "e.g. +1-555-0100",
  },
  {
    type: "text",
    name: "email",
    label: "Email",
    placeholder: "e.g. contact@acme.example.com",
  },
  {
    type: "text",
    name: "address",
    label: "Address",
    placeholder: "e.g. 123 Main St, Springfield",
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Type and press Enter...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

export function companyToRow(c: Company): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    industry: c.industry ?? "",
    website: c.website ?? "",
    type: c.type ?? "",
    size: c.size ?? "",
    tags: (c.tags ?? []).join(", "),
    updated: c.updatedAt,
  };
}

/** Max recent quotes/invoices shown in customer detail billing section. */
export const CUSTOMER_BILLING_MAX_ROWS = 10;

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Customer } from "../../types/customer.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";

const actionBtns = createActionBtns("customers", "customers-form-container", {
  nameField: "name",
});

export const CUSTOMER_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/customers/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
  },
  {
    key: "phone",
    label: "Phone",
    sortable: true,
  },
  {
    key: "company",
    label: "Company",
    sortable: true,
    render: (v, row) =>
      v ? <Highlight text={String(v)} q={row._q as string} /> : "",
  },
  {
    key: "city",
    label: "City",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const CUSTOMER_FORM_FIELDS: FieldDef[] = [
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
    placeholder: "e.g. billing@example.com",
  },
  {
    type: "text",
    name: "phone",
    label: "Phone",
    placeholder: "e.g. +1-555-0100",
  },
  {
    type: "text",
    name: "company",
    label: "Company",
    placeholder: "Organization name",
  },
  {
    type: "text",
    name: "street",
    label: "Street address",
  },
  {
    type: "text",
    name: "city",
    label: "City",
  },
  {
    type: "text",
    name: "state",
    label: "State / Province",
  },
  {
    type: "text",
    name: "postalCode",
    label: "Postal code",
  },
  {
    type: "text",
    name: "country",
    label: "Country",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

export function customerToRow(c: Customer): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    company: c.company ?? "",
    city: c.billingAddress?.city ?? "",
  };
}

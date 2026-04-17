import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { DnsDomain } from "../../types/dns.types.ts";
import { DNS_RECORD_TYPES } from "../../types/dns.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

export const DNS_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: "success",
  pending: "warning",
};

export const DNS_BOOLEAN_VARIANTS: Record<string, BadgeVariant> = {
  yes: "success",
  no: "neutral",
};

export const DNS_RECORD_FORM_FIELDS: FieldDef[] = [
  {
    type: "select",
    name: "type",
    label: "Type",
    required: true,
    options: DNS_RECORD_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    placeholder: "@",
  },
  { type: "text", name: "value", label: "Value", required: true },
  { type: "number", name: "ttl", label: "TTL (1 = Auto)", min: 1 },
  {
    type: "select",
    name: "proxied",
    label: "Proxied",
    options: [
      { value: "", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
];

const actionBtns = createActionBtns("dns", "dns-form-container", {
  nameField: "domain",
});

const autoRenewRenderer = (v: unknown) =>
  v === true || v === "true"
    ? <span class="badge badge--success">Yes</span>
    : <span class="badge badge--neutral">No</span>;

export const DNS_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "domain",
    label: "Domain",
    sortable: true,
    render: (v, row) => (
      <a href={`/dns/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "provider",
    label: "Provider",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(DNS_STATUS_VARIANTS),
  },
  {
    key: "expiryDate",
    label: "Expires",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "autoRenew",
    label: "Auto-renew",
    render: autoRenewRenderer,
  },
  {
    key: "recordCount",
    label: "Records",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

export function dnsToRow(d: DnsDomain): Record<string, unknown> {
  return {
    id: d.id,
    domain: d.domain,
    provider: d.provider ?? "",
    status: d.status ?? "",
    expiryDate: d.expiryDate ?? "",
    autoRenew: d.autoRenew ?? false,
    recordCount: (d.dnsRecords ?? []).length,
    notes: d.notes ?? "",
    project: d.project ?? "",
  };
}

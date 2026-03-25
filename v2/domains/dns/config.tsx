// DNS domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateDnsDomain,
  DnsDomain,
  UpdateDnsDomain,
} from "../../types/dns.types.ts";
import { DNS_PROVIDERS } from "../../types/dns.types.ts";
import { getDnsService } from "../../singletons/services.ts";
import { DNS_TABLE_COLUMNS, dnsToRow } from "./constants.tsx";
import { DnsDetailView } from "../../views/dns-detail.tsx";
import { DnsCard } from "../../views/components/dns-card.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "domain", label: "Domain", required: true },
  {
    type: "select",
    name: "provider",
    label: "Provider",
    options: DNS_PROVIDERS.map((p) => ({ value: p, label: p })),
  },
  { type: "date", name: "expiryDate", label: "Expiry date" },
  {
    type: "select",
    name: "autoRenew",
    label: "Auto-renew",
    options: [
      { value: "", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    type: "number",
    name: "renewalCostUsd",
    label: "Renewal cost (USD/yr)",
    min: 0,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

export const dnsConfig: DomainConfig<
  DnsDomain,
  CreateDnsDomain,
  UpdateDnsDomain
> = {
  name: "dns",
  singular: "DNS domain",
  plural: "DNS",
  path: "/dns",
  ssePrefix: "dns",
  styles: ["/css/views/dns.css"],
  emptyMessage: "No DNS domains yet. Add one or sync from Cloudflare.",
  defaultView: "table",

  stateKeys: ["view", "provider", "q", "sort", "order"],
  columns: DNS_TABLE_COLUMNS,
  formFields: FORM_FIELDS,

  filters: [
    {
      name: "provider",
      label: "All providers",
      options: DNS_PROVIDERS.map((p) => ({ value: p, label: p })),
    },
  ],

  toRow: dnsToRow,

  Card: ({ item, q }) => <DnsCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(FORM_FIELDS, body);
    if (parsed.autoRenew !== undefined) {
      parsed.autoRenew = parsed.autoRenew === "true";
    }
    return parsed as CreateDnsDomain;
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(FORM_FIELDS, body, { clearEmpty: true });
    if (parsed.autoRenew !== undefined) {
      parsed.autoRenew = parsed.autoRenew === "true";
    }
    return parsed as Partial<UpdateDnsDomain>;
  },

  getService: () => getDnsService(),

  searchPredicate: (item, q) =>
    item.domain.toLowerCase().includes(q) ||
    (item.provider ?? "").toLowerCase().includes(q) ||
    (item.notes ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),

  toolbarActions: () => (
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-post="/dns/sync"
      hx-swap="none"
    >
      Sync Cloudflare
    </button>
  ),

  DetailView: ({ item, ...viewProps }) =>
    DnsDetailView({ item, ...viewProps }) as ReturnType<typeof DnsDetailView>,
};

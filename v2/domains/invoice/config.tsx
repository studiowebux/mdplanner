// Invoice domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../../types/invoice.types.ts";
import { INVOICE_STATUSES } from "../../types/invoice.types.ts";
import {
  getCustomerService,
  getInvoiceService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  INVOICE_FORM_FIELDS,
  INVOICE_TABLE_COLUMNS,
  invoiceToRow,
} from "./constants.tsx";

let _customerNames: Map<string, string> = new Map();
import { InvoiceCard } from "../../views/components/invoice-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const invoiceConfig: DomainConfig<
  Invoice,
  CreateInvoice,
  UpdateInvoice
> = {
  name: "invoices",
  singular: "Invoice",
  path: "/invoices",
  ssePrefix: "invoice",
  styles: ["/css/views/invoices.css", "/css/views/billing.css"],
  emptyMessage: "No invoices yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "status",
    "customerId",
    "q",
    "sort",
    "order",
    "hideCompleted",
  ],
  columns: INVOICE_TABLE_COLUMNS,
  formFields: INVOICE_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: [...INVOICE_STATUSES].map((s) => ({
        value: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
      })),
    },
    {
      name: "customerId",
      label: "All customers",
      options: [],
    },
  ],

  hideCompleted: { field: "status", value: ["paid", "cancelled"] },

  toRow: (inv) => {
    const service = getInvoiceService();
    return invoiceToRow(inv, service.displayStatus(inv), _customerNames);
  },

  Card: ({ item, q }) => <InvoiceCard item={item} q={q} />,

  parseCreate: (body) => {
    const data = parseFormBody(INVOICE_FORM_FIELDS, body);
    if (data.taxRate != null) data.taxRate = Number(data.taxRate);
    return data as CreateInvoice;
  },

  parseUpdate: (body) => {
    const data = parseFormBody(INVOICE_FORM_FIELDS, body, {
      clearEmpty: true,
    });
    if (data.taxRate != null) data.taxRate = Number(data.taxRate);
    return data as Partial<UpdateInvoice>;
  },

  getService: () => getInvoiceService(),

  extractFilterOptions: async () => {
    const customers = await getCustomerService().list();
    _customerNames = new Map(customers.map((c) => [c.id, c.name]));
    return {
      customerId: customers.map((c) => ({ value: c.id, label: c.name })),
    };
  },

  searchPredicate: createSearchPredicate<Invoice>([
    { type: "string", get: (i) => i.title },
    { type: "string", get: (i) => i.number },
    { type: "string", get: (i) => i.notes },
  ]),
};

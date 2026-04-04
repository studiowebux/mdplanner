// Payment domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreatePayment,
  Payment,
  UpdatePayment,
} from "../../types/payment.types.ts";
import { PAYMENT_METHODS } from "../../types/payment.types.ts";
import {
  getInvoiceService,
  getPaymentService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  PAYMENT_FORM_FIELDS,
  PAYMENT_TABLE_COLUMNS,
  paymentToRow,
} from "./constants.tsx";

let _invoiceNames: Map<string, string> = new Map();
import { PaymentCard } from "../../views/components/payment-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const paymentConfig: DomainConfig<
  Payment,
  CreatePayment,
  UpdatePayment
> = {
  name: "payments",
  singular: "Payment",
  path: "/payments",
  ssePrefix: "payment",
  styles: ["/css/views/payments.css"],
  emptyMessage: "No payments yet. Record one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "invoiceId",
    "method",
    "q",
    "sort",
    "order",
  ],
  columns: PAYMENT_TABLE_COLUMNS,
  formFields: PAYMENT_FORM_FIELDS,

  filters: [
    {
      name: "method",
      label: "All methods",
      options: PAYMENT_METHODS.map((m) => ({
        value: m,
        label: m.charAt(0).toUpperCase() + m.slice(1),
      })),
    },
  ],

  toRow: (p) => paymentToRow(p, _invoiceNames),

  Card: ({ item, q }) => <PaymentCard item={item} q={q} />,

  parseCreate: (body) => {
    const data = parseFormBody(PAYMENT_FORM_FIELDS, body);
    if (data.amount != null) data.amount = Number(data.amount);
    return data as CreatePayment;
  },

  parseUpdate: (body) => {
    const data = parseFormBody(PAYMENT_FORM_FIELDS, body, {
      clearEmpty: true,
    });
    if (data.amount != null) data.amount = Number(data.amount);
    return data as Partial<UpdatePayment>;
  },

  extractFilterOptions: async () => {
    const invoices = await getInvoiceService().list();
    _invoiceNames = new Map(
      invoices.map((inv) => [inv.id, `${inv.number} — ${inv.title}`]),
    );
    return {};
  },

  getService: () => getPaymentService(),

  searchPredicate: createSearchPredicate<Payment>([
    { type: "string", get: (p) => p.reference },
    { type: "string", get: (p) => p.notes },
  ]),
};

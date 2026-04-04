// Quote domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateQuote,
  Quote,
  UpdateQuote,
} from "../../types/quote.types.ts";
import { QUOTE_STATUSES } from "../../types/quote.types.ts";
import {
  getCustomerService,
  getQuoteService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  QUOTE_FORM_FIELDS,
  QUOTE_TABLE_COLUMNS,
  quoteToRow,
} from "./constants.tsx";

let _customerNames: Map<string, string> = new Map();
import { QuoteCard } from "../../views/components/quote-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const quoteConfig: DomainConfig<Quote, CreateQuote, UpdateQuote> = {
  name: "quotes",
  singular: "Quote",
  path: "/quotes",
  ssePrefix: "quote",
  styles: ["/css/views/quotes.css", "/css/views/billing.css"],
  emptyMessage: "No quotes yet. Create one to get started.",
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
  columns: QUOTE_TABLE_COLUMNS,
  formFields: QUOTE_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: QUOTE_STATUSES.map((s) => ({ value: s, label: s })),
    },
    {
      name: "customerId",
      label: "All customers",
      options: [],
    },
  ],

  hideCompleted: { field: "status", value: ["accepted", "rejected"] },

  toRow: (q) => quoteToRow(q, _customerNames),

  Card: ({ item, q }) => <QuoteCard item={item} q={q} />,

  parseCreate: (body) => {
    const data = parseFormBody(QUOTE_FORM_FIELDS, body);
    if (data.taxRate != null) data.taxRate = Number(data.taxRate);
    return data as CreateQuote;
  },

  parseUpdate: (body) => {
    const data = parseFormBody(QUOTE_FORM_FIELDS, body, {
      clearEmpty: true,
    });
    if (data.taxRate != null) data.taxRate = Number(data.taxRate);
    return data as Partial<UpdateQuote>;
  },

  getService: () => getQuoteService(),

  extractFilterOptions: async () => {
    const customers = await getCustomerService().list();
    _customerNames = new Map(customers.map((c) => [c.id, c.name]));
    return {
      customerId: customers.map((c) => ({ value: c.id, label: c.name })),
    };
  },

  searchPredicate: createSearchPredicate<Quote>([
    { type: "string", get: (q) => q.title },
    { type: "string", get: (q) => q.number },
    { type: "string", get: (q) => q.notes },
  ]),
};

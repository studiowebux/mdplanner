// BillingRate domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate,
} from "../../types/billing-rate.types.ts";
import {
  getBillingRateService,
  getPeopleService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  BILLING_RATE_FORM_FIELDS,
  BILLING_RATE_TABLE_COLUMNS,
  billingRateToRow,
} from "./constants.tsx";
import { BillingRateCard } from "../../views/components/billing-rate-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const billingRateConfig: DomainConfig<
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate
> = {
  name: "billing-rates",
  singular: "Billing Rate",
  path: "/billing-rates",
  ssePrefix: "billing-rate",
  styles: ["/css/views/billing-rates.css"],
  emptyMessage: "No billing rates yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "q",
    "sort",
    "order",
  ],
  columns: BILLING_RATE_TABLE_COLUMNS,
  formFields: BILLING_RATE_FORM_FIELDS,
  // `notes` is edited in-place on the detail page via "Edit Mode".
  inlineEditFields: ["notes"],

  toRow: billingRateToRow,

  Card: ({ item, q }) => <BillingRateCard item={item} q={q} />,

  parseCreate: (body) => {
    const data = parseFormBody(BILLING_RATE_FORM_FIELDS, body);
    if (data.rate != null) data.rate = Number(data.rate);
    if (data.isDefault != null) data.isDefault = Boolean(data.isDefault);
    return data as CreateBillingRate;
  },

  parseUpdate: (body) => {
    const data = parseFormBody(BILLING_RATE_FORM_FIELDS, body, {
      clearEmpty: true,
    });
    if (data.rate != null) data.rate = Number(data.rate);
    if (data.isDefault != null) data.isDefault = Boolean(data.isDefault);
    return data as Partial<UpdateBillingRate>;
  },

  getService: () => getBillingRateService(),

  // Assignee is stored as a person ID; resolve it to a name for the edit form's
  // autocomplete display (the hidden value keeps the ID).
  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.assignee) {
      const person = await getPeopleService().getById(values.assignee);
      if (person) resolved.assignee = person.name;
    }
    return resolved;
  },

  searchPredicate: createSearchPredicate<BillingRate>([
    { type: "string", get: (r) => r.name },
    { type: "string", get: (r) => r.notes },
  ]),
};

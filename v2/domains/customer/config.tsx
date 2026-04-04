// Customer domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateCustomer,
  Customer,
  UpdateCustomer,
} from "../../types/customer.types.ts";
import { getCustomerService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  CUSTOMER_FORM_FIELDS,
  CUSTOMER_TABLE_COLUMNS,
  customerToRow,
} from "./constants.tsx";
import { CustomerCard } from "../../views/components/customer-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import type { BillingAddress } from "../../types/customer.types.ts";

function nestAddress(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const street = flat.street as string | undefined;
  const city = flat.city as string | undefined;
  const state = flat.state as string | undefined;
  const postalCode = flat.postalCode as string | undefined;
  const country = flat.country as string | undefined;

  const hasAddress = street || city || state || postalCode || country;
  const result = { ...flat };
  delete result.street;
  delete result.city;
  delete result.state;
  delete result.postalCode;
  delete result.country;

  if (hasAddress) {
    result.billingAddress = {
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
    } satisfies BillingAddress;
  }
  return result;
}

export const customerConfig: DomainConfig<
  Customer,
  CreateCustomer,
  UpdateCustomer
> = {
  name: "customers",
  singular: "Customer",
  path: "/customers",
  ssePrefix: "customer",
  styles: ["/css/views/customers.css"],
  emptyMessage: "No customers yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "q",
    "sort",
    "order",
  ],
  columns: CUSTOMER_TABLE_COLUMNS,
  formFields: CUSTOMER_FORM_FIELDS,

  toRow: customerToRow,

  Card: ({ item, q }) => <CustomerCard item={item} q={q} />,

  parseCreate: (body) => {
    const flat = parseFormBody(CUSTOMER_FORM_FIELDS, body);
    return nestAddress(flat) as CreateCustomer;
  },

  parseUpdate: (body) => {
    const flat = parseFormBody(CUSTOMER_FORM_FIELDS, body, {
      clearEmpty: true,
    });
    return nestAddress(flat) as Partial<UpdateCustomer>;
  },

  getService: () => getCustomerService(),

  searchPredicate: createSearchPredicate<Customer>([
    { type: "string", get: (c) => c.name },
    { type: "string", get: (c) => c.email },
    { type: "string", get: (c) => c.company },
    { type: "string", get: (c) => c.notes },
  ]),

  resolveFormValues: async (values) => {
    if (!values.name) return values;
    const customer = await getCustomerService().getByName(values.name);
    if (!customer?.billingAddress) return values;
    const addr = customer.billingAddress;
    return {
      ...values,
      street: addr.street ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      postalCode: addr.postalCode ?? "",
      country: addr.country ?? "",
    };
  },
};

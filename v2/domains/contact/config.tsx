// Contact domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  Contact,
  CreateContact,
  UpdateContact,
} from "../../types/contact.types.ts";
import { getContactService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  CONTACT_FORM_FIELDS,
  CONTACT_TABLE_COLUMNS,
  CONTACT_TYPE_OPTIONS,
  contactToRow,
} from "./constants.tsx";
import { ContactCard } from "../../views/components/contact-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const contactConfig: DomainConfig<
  Contact,
  CreateContact,
  UpdateContact
> = {
  name: "contacts",
  singular: "Contact",
  path: "/contacts",
  ssePrefix: "contact",
  styles: ["/css/views/contacts.css"],
  emptyMessage: "No contacts yet. Create one to get started.",
  defaultView: "card",

  stateKeys: ["view", "type", "company", "q", "sort", "order"],
  columns: CONTACT_TABLE_COLUMNS,
  formFields: CONTACT_FORM_FIELDS,

  filters: [
    {
      name: "type",
      label: "All types",
      options: CONTACT_TYPE_OPTIONS,
    },
    {
      name: "company",
      label: "All companies",
      options: [],
    },
  ],

  toRow: contactToRow,

  Card: ({ item, q }) => <ContactCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(CONTACT_FORM_FIELDS, body) as CreateContact,

  parseUpdate: (body) =>
    parseFormBody(CONTACT_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateContact>,

  getService: () => getContactService(),

  extractFilterOptions: async () => {
    const contacts = await getContactService().list();
    const companies = [
      ...new Set(
        contacts.map((c) => c.company).filter(Boolean) as string[],
      ),
    ].sort();
    return { company: companies };
  },

  searchPredicate: createSearchPredicate<Contact>([
    { type: "string", get: (c) => c.name },
    { type: "string", get: (c) => c.email },
    { type: "string", get: (c) => c.role },
    { type: "string", get: (c) => c.company },
    { type: "string", get: (c) => c.notes },
  ]),
};

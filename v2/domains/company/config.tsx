// Company domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  Company,
  CreateCompany,
  UpdateCompany,
} from "../../types/company.types.ts";
import { getCompanyService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  COMPANY_FORM_FIELDS,
  COMPANY_TABLE_COLUMNS,
  COMPANY_TYPE_OPTIONS,
  companyToRow,
} from "./constants.tsx";
import { CompanyCard } from "../../views/components/company-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const companyConfig: DomainConfig<
  Company,
  CreateCompany,
  UpdateCompany
> = {
  name: "companies",
  singular: "Company",
  path: "/companies",
  ssePrefix: "company",
  styles: ["/css/views/companies.css"],
  emptyMessage: "No companies yet. Create one to get started.",
  defaultView: "card",

  stateKeys: ["view", "type", "industry", "q", "sort", "order"],
  columns: COMPANY_TABLE_COLUMNS,
  formFields: COMPANY_FORM_FIELDS,

  filters: [
    {
      name: "type",
      label: "All types",
      options: COMPANY_TYPE_OPTIONS,
    },
    {
      name: "industry",
      label: "All industries",
      options: [],
    },
  ],

  toRow: companyToRow,

  Card: ({ item, q }) => <CompanyCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(COMPANY_FORM_FIELDS, body) as CreateCompany,

  parseUpdate: (body) =>
    parseFormBody(COMPANY_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateCompany>,

  getService: () => getCompanyService(),

  extractFilterOptions: async () => {
    const companies = await getCompanyService().list();
    const industries = [
      ...new Set(
        companies.map((c) => c.industry).filter(Boolean) as string[],
      ),
    ].sort();
    return { industry: industries };
  },

  searchPredicate: createSearchPredicate<Company>([
    { type: "string", get: (c) => c.name },
    { type: "string", get: (c) => c.industry },
    { type: "string", get: (c) => c.website },
    { type: "string", get: (c) => c.address },
    { type: "string", get: (c) => c.notes },
  ]),
};

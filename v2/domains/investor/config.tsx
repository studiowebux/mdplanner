// Investor domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateInvestor,
  Investor,
  UpdateInvestor,
} from "../../types/investor.types.ts";
import { getInvestorService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  INVESTOR_FORM_FIELDS,
  INVESTOR_STAGE_OPTIONS,
  INVESTOR_STATUS_OPTIONS,
  INVESTOR_TABLE_COLUMNS,
  INVESTOR_TYPE_OPTIONS,
  investorToRow,
} from "./constants.tsx";
import { InvestorCard } from "../../views/components/investor-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const investorConfig: DomainConfig<
  Investor,
  CreateInvestor,
  UpdateInvestor
> = {
  name: "investors",
  singular: "Investor",
  plural: "Investors",
  path: "/investors",
  ssePrefix: "investor",
  styles: ["/css/views/investors.css"],
  emptyMessage: "No investors yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "type", "stage", "status", "tag", "q", "sort", "order"],
  columns: INVESTOR_TABLE_COLUMNS,
  formFields: INVESTOR_FORM_FIELDS,

  filters: [
    { name: "type", label: "All types", options: INVESTOR_TYPE_OPTIONS },
    { name: "stage", label: "All stages", options: INVESTOR_STAGE_OPTIONS },
    { name: "status", label: "All statuses", options: INVESTOR_STATUS_OPTIONS },
  ],

  toRow: investorToRow,

  Card: ({ item, q }) => <InvestorCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(INVESTOR_FORM_FIELDS, body) as CreateInvestor;
    return {
      ...parsed,
      amountTarget: parsed.amountTarget != null
        ? Number(parsed.amountTarget)
        : undefined,
    };
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(INVESTOR_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateInvestor>;
    if (parsed.amountTarget !== undefined) {
      parsed.amountTarget = Number(parsed.amountTarget);
    }
    return parsed;
  },

  getService: () => getInvestorService(),

  extractFilterOptions: async () => {
    const items = await getInvestorService().list();
    const types = [
      ...new Set(items.map((inv) => inv.type).filter(Boolean) as string[]),
    ].sort();
    const stages = [
      ...new Set(items.map((inv) => inv.stage).filter(Boolean) as string[]),
    ].sort();
    const statuses = [
      ...new Set(items.map((inv) => inv.status).filter(Boolean) as string[]),
    ].sort();
    return { type: types, stage: stages, status: statuses };
  },

  searchPredicate: createSearchPredicate<Investor>([
    { type: "string", get: (inv) => inv.name },
    { type: "string", get: (inv) => inv.contact },
    { type: "string", get: (inv) => inv.notes },
  ]),
};

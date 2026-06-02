// SAFe domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateSafe, Safe, UpdateSafe } from "../../types/safe.types.ts";
import { getSafeService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  SAFE_FORM_FIELDS,
  SAFE_TABLE_COLUMNS,
  safeToRow,
} from "./constants.tsx";
import { SafeCard } from "../../views/components/safe-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const safeConfig: DomainConfig<Safe, CreateSafe, UpdateSafe> = {
  name: "safe",
  singular: "SAFE",
  plural: "SAFEs",
  path: "/safe",
  ssePrefix: "safe",
  styles: ["/css/views/safe.css"],
  emptyMessage: "No SAFE agreements yet. Create one to get started.",
  defaultView: "table",

  // `notes` is edited in-place on the detail page via "Edit Mode".
  inlineEditFields: ["notes"],

  stateKeys: ["view", "q", "status", "type", "sort", "order"],
  columns: SAFE_TABLE_COLUMNS,
  formFields: SAFE_FORM_FIELDS,

  filters: [
    { name: "status", label: "All statuses", options: [] },
    { name: "type", label: "All types", options: [] },
  ],

  toRow: safeToRow,

  Card: ({ item, q }) => <SafeCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(SAFE_FORM_FIELDS, body) as CreateSafe;
    return {
      ...parsed,
      amount: Number(parsed.amount ?? 0),
      valuation_cap: Number(parsed.valuation_cap ?? 0),
      discount: Number(parsed.discount ?? 0),
    };
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(SAFE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateSafe>;
    if (parsed.amount !== undefined) parsed.amount = Number(parsed.amount);
    if (parsed.valuation_cap !== undefined) {
      parsed.valuation_cap = Number(parsed.valuation_cap);
    }
    if (parsed.discount !== undefined) {
      parsed.discount = Number(parsed.discount);
    }
    return parsed;
  },

  getService: () => getSafeService(),

  extractFilterOptions: async () => {
    const items = await getSafeService().list();
    const statuses = [
      ...new Set(items.map((s) => s.status).filter(Boolean) as string[]),
    ].sort();
    const types = [
      ...new Set(items.map((s) => s.type).filter(Boolean) as string[]),
    ].sort();
    return { status: statuses, type: types };
  },

  searchPredicate: createSearchPredicate<Safe>([
    { type: "string", get: (s) => s.investor },
    { type: "string", get: (s) => s.notes },
  ]),
};

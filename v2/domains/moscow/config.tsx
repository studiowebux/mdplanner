// MoSCoW domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMoscow,
  Moscow,
  UpdateMoscow,
} from "../../types/moscow.types.ts";
import { getMoscowService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  MOSCOW_FORM_FIELDS,
  MOSCOW_TABLE_COLUMNS,
  moscowToRow,
} from "./constants.tsx";
import { MoscowCard } from "../../views/components/moscow-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const moscowConfig: DomainConfig<Moscow, CreateMoscow, UpdateMoscow> = {
  name: "moscow",
  singular: "MoSCoW Analysis",
  plural: "MoSCoW Analyses",
  path: "/moscow",
  ssePrefix: "moscow",
  styles: ["/css/views/moscow.css"],
  emptyMessage: "No MoSCoW analyses yet. Create one to get started.",
  defaultView: "card",

  stateKeys: [
    "view",
    "project",
    "q",
    "sort",
    "order",
  ],
  columns: MOSCOW_TABLE_COLUMNS,
  formFields: MOSCOW_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: moscowToRow,

  Card: ({ item, q }) => <MoscowCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(MOSCOW_FORM_FIELDS, body) as CreateMoscow,

  parseUpdate: (body) =>
    parseFormBody(MOSCOW_FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdateMoscow
    >,

  getService: () => getMoscowService(),

  extractFilterOptions: async () => {
    const items = await getMoscowService().list();
    const projects = [
      ...new Set(
        items.map((m) => m.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<Moscow>([
    { type: "string", get: (i) => i.title },
    { type: "array", get: (i) => i.must },
    { type: "array", get: (i) => i.should },
    { type: "array", get: (i) => i.could },
    { type: "array", get: (i) => i.wont },
    { type: "string", get: (i) => i.notes },
  ]),
};

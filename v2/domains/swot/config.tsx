// SWOT domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateSwot, Swot, UpdateSwot } from "../../types/swot.types.ts";
import { getSwotService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  SWOT_FORM_FIELDS,
  SWOT_TABLE_COLUMNS,
  swotToRow,
} from "./constants.tsx";
import { SwotCard } from "../../views/components/swot-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const swotConfig: DomainConfig<Swot, CreateSwot, UpdateSwot> = {
  name: "swot",
  singular: "SWOT Analysis",
  plural: "SWOT Analyses",
  path: "/swot",
  ssePrefix: "swot",
  styles: ["/css/views/swot.css"],
  emptyMessage: "No SWOT analyses yet. Create one to get started.",
  defaultView: "card",

  stateKeys: [
    "view",
    "project",
    "q",
    "sort",
    "order",
  ],
  columns: SWOT_TABLE_COLUMNS,
  formFields: SWOT_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: swotToRow,

  Card: ({ item, q }) => <SwotCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(SWOT_FORM_FIELDS, body) as CreateSwot,

  parseUpdate: (body) =>
    parseFormBody(SWOT_FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdateSwot
    >,

  getService: () => getSwotService(),

  extractFilterOptions: async () => {
    const items = await getSwotService().list();
    const projects = [
      ...new Set(
        items.map((s) => s.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<Swot>([
    { type: "string", get: (i) => i.title },
    { type: "array", get: (i) => i.strengths },
    { type: "array", get: (i) => i.weaknesses },
    { type: "array", get: (i) => i.opportunities },
    { type: "array", get: (i) => i.threats },
    { type: "string", get: (i) => i.notes },
  ]),
};

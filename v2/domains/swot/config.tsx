// SWOT domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateSwot, Swot, UpdateSwot } from "../../types/swot.types.ts";
import { getSwotService } from "../../singletons/services.ts";
import {
  SWOT_FORM_FIELDS,
  SWOT_QUADRANTS,
  SWOT_TABLE_COLUMNS,
  swotToRow,
} from "./constants.tsx";
import { SwotCard } from "../../views/components/swot-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

/** Convert array-table [{text: "..."}] objects to flat string[] for quadrants. */
function flattenQuadrants(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data };
  for (const name of SWOT_QUADRANTS) {
    const key = name.toLowerCase();
    const val = result[key];
    if (Array.isArray(val)) {
      result[key] = val.map((item: unknown) =>
        typeof item === "object" && item !== null && "text" in item
          ? String((item as Record<string, unknown>).text)
          : String(item)
      );
    }
  }
  return result;
}

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

  parseCreate: (body) => {
    const raw = parseFormBody(SWOT_FORM_FIELDS, body);
    return flattenQuadrants(raw) as CreateSwot;
  },

  parseUpdate: (body) => {
    const raw = parseFormBody(SWOT_FORM_FIELDS, body, { clearEmpty: true });
    return flattenQuadrants(raw) as Partial<UpdateSwot>;
  },

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

  searchPredicate: (item, q) =>
    item.title.toLowerCase().includes(q) ||
    item.strengths.some((i) => i.toLowerCase().includes(q)) ||
    item.weaknesses.some((i) => i.toLowerCase().includes(q)) ||
    item.opportunities.some((i) => i.toLowerCase().includes(q)) ||
    item.threats.some((i) => i.toLowerCase().includes(q)) ||
    (item.notes ?? "").toLowerCase().includes(q),
};

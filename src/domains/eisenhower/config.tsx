// Eisenhower domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateEisenhower,
  Eisenhower,
  UpdateEisenhower,
} from "../../types/eisenhower.types.ts";
import { getEisenhowerService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  EISENHOWER_FORM_FIELDS,
  EISENHOWER_QUADRANT_KEYS,
  EISENHOWER_TABLE_COLUMNS,
  eisenhowerToRow,
} from "./constants.tsx";
import { EisenhowerCard } from "../../views/components/eisenhower-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const eisenhowerConfig: DomainConfig<
  Eisenhower,
  CreateEisenhower,
  UpdateEisenhower
> = {
  name: "eisenhower",
  singular: "Eisenhower Matrix",
  plural: "Eisenhower Matrices",
  path: "/eisenhower",
  ssePrefix: "eisenhower",
  styles: ["/css/views/eisenhower.css"],
  emptyMessage: "No Eisenhower matrices yet. Create one to get started.",
  defaultView: "card",

  stateKeys: ["view", "project", "q", "sort", "order"],
  columns: EISENHOWER_TABLE_COLUMNS,
  formFields: EISENHOWER_FORM_FIELDS,
  // `notes` is edited in-place on the detail page via "Edit Mode".
  // Quadrants use their own inline editor.
  inlineEditFields: ["notes"],

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: eisenhowerToRow,

  Card: ({ item, q }) => <EisenhowerCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(EISENHOWER_FORM_FIELDS, body) as CreateEisenhower,

  parseUpdate: (body) =>
    parseFormBody(EISENHOWER_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateEisenhower>,

  getService: () => getEisenhowerService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const items = await getEisenhowerService().list();
    const projects = [
      ...new Set(
        items.map((e) => e.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<Eisenhower>([
    { type: "string", get: (e) => e.title },
    ...EISENHOWER_QUADRANT_KEYS.map((key) => ({
      type: "array" as const,
      get: (e: Eisenhower) => e[key],
    })),
    { type: "string", get: (e) => e.notes },
  ]),
};

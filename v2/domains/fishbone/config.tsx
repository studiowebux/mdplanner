// Fishbone domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateFishbone,
  Fishbone,
  UpdateFishbone,
} from "../../types/fishbone.types.ts";
import { getFishboneService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  FISHBONE_FORM_FIELDS,
  FISHBONE_TABLE_COLUMNS,
  fishboneToRow,
} from "./constants.tsx";
import { FishboneCard } from "../../views/components/fishbone-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const fishboneConfig: DomainConfig<
  Fishbone,
  CreateFishbone,
  UpdateFishbone
> = {
  name: "fishbone",
  singular: "Fishbone Diagram",
  plural: "Fishbone Diagrams",
  path: "/fishbones",
  ssePrefix: "fishbone",
  styles: ["/css/views/fishbone.css"],
  emptyMessage: "No fishbone diagrams yet. Create one to get started.",
  defaultView: "card",

  stateKeys: [
    "view",
    "project",
    "q",
    "sort",
    "order",
  ],
  columns: FISHBONE_TABLE_COLUMNS,
  formFields: FISHBONE_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: fishboneToRow,

  Card: ({ item, q }) => <FishboneCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(FISHBONE_FORM_FIELDS, body) as CreateFishbone,

  parseUpdate: (body) =>
    parseFormBody(FISHBONE_FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdateFishbone
    >,

  getService: () => getFishboneService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const items = await getFishboneService().list();
    const projects = [
      ...new Set(
        items.map((f) => f.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<Fishbone>([
    { type: "string", get: (f) => f.title },
    { type: "string", get: (f) => f.description },
    {
      type: "array",
      get: (f) => f.causes.flatMap((c) => [c.section, ...c.items]),
    },
  ]),
};

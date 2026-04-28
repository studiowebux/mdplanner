// C4 domain config — factory config for list view + custom canvas view.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  C4Component,
  CreateC4Component,
  UpdateC4Component,
} from "../../types/c4.types.ts";
import { getC4Service } from "../../singletons/services.ts";
import { parseFormBody } from "../../utils/form-parser.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  C4_FORM_FIELDS,
  C4_LEVEL_LABELS,
  C4_LEVELS,
  C4_TABLE_COLUMNS,
  c4ToRow,
} from "./constants.tsx";
import { C4Canvas } from "../../views/components/c4-canvas.tsx";
import { C4Card } from "../../views/components/c4-card.tsx";

export const c4Config: DomainConfig<
  C4Component,
  CreateC4Component,
  UpdateC4Component
> = {
  name: "c4",
  singular: "C4 Component",
  plural: "C4 Architecture",
  path: "/c4",
  ssePrefix: "c4",
  styles: ["/css/views/c4.css"],
  scripts: ["/js/c4-canvas.js"],
  emptyMessage: "No C4 components yet. Switch to edit mode to add components.",
  defaultView: "canvas",

  stateKeys: [
    "view",
    "diagram",
    "level",
    "parent",
    "q",
    "sort",
    "order",
    "mode",
  ],

  columns: C4_TABLE_COLUMNS,
  formFields: C4_FORM_FIELDS,

  filters: [
    {
      name: "diagram",
      label: "All diagrams",
      options: [],
    },
    {
      name: "level",
      label: "All levels",
      options: C4_LEVELS.map((l) => ({ value: l, label: C4_LEVEL_LABELS[l] })),
    },
  ],

  Card: C4Card,
  toRow: c4ToRow,

  parseCreate: (body) =>
    parseFormBody(C4_FORM_FIELDS, body) as CreateC4Component,

  parseUpdate: (body) =>
    parseFormBody(C4_FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdateC4Component
    >,

  getService: () => getC4Service(),

  extractFilterOptions: async () => {
    const items = await getC4Service().list();
    const levels = [...new Set(items.map((c) => c.level))].sort();
    const diagrams = [
      "default",
      ...[...new Set(items.map((c) => c.diagram ?? "default"))].filter((d) =>
        d !== "default"
      ).sort(),
    ];
    return { level: levels, diagram: diagrams };
  },

  searchPredicate: createSearchPredicate<C4Component>([
    { type: "string", get: (i) => i.name },
    { type: "string", get: (i) => i.type },
    { type: "string", get: (i) => i.technology },
    { type: "string", get: (i) => i.description },
  ]),

  extraViewModes: [{ key: "canvas", label: "Canvas" }],

  customViewRenderer: async (_view, state, items, _nonce) => {
    const diagram = (state.diagram as string) ?? "default";
    const level = (state.level as string) ?? "context";
    const parentId = (state.parent as string) ?? undefined;
    const editMode = (state.mode as string) === "edit";

    let parentName: string | undefined;
    if (parentId) {
      const parent = await getC4Service().getById(parentId);
      parentName = parent?.name;
    }

    return (
      <C4Canvas
        components={items}
        diagram={diagram}
        level={level}
        parentId={parentId}
        parentName={parentName}
        editMode={editMode}
      />
    );
  },
};

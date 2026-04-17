// Lean Canvas domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateLeanCanvas,
  LeanCanvas,
  UpdateLeanCanvas,
} from "../../types/lean-canvas.types.ts";
import { getLeanCanvasService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  LEAN_CANVAS_FORM_FIELDS,
  LEAN_CANVAS_TABLE_COLUMNS,
  leanCanvasToRow,
} from "./constants.tsx";
import { LeanCanvasCard } from "../../views/components/lean-canvas-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const leanCanvasConfig: DomainConfig<
  LeanCanvas,
  CreateLeanCanvas,
  UpdateLeanCanvas
> = {
  name: "lean-canvases",
  singular: "Lean Canvas",
  path: "/lean-canvases",
  ssePrefix: "lean-canvas",
  styles: ["/css/views/lean-canvases.css"],
  emptyMessage: "No lean canvases yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order", "project"],
  columns: LEAN_CANVAS_TABLE_COLUMNS,
  formFields: LEAN_CANVAS_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "Project",
      options: [],
    },
  ],

  toRow: leanCanvasToRow,

  Card: ({ item, q }) => <LeanCanvasCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(LEAN_CANVAS_FORM_FIELDS, body) as CreateLeanCanvas,

  parseUpdate: (body) =>
    parseFormBody(LEAN_CANVAS_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateLeanCanvas>,

  getService: () => getLeanCanvasService(),

  searchPredicate: createSearchPredicate<LeanCanvas>([
    { type: "string", get: (lc) => lc.title },
    { type: "string", get: (lc) => lc.project ?? "" },
    { type: "array", get: (lc) => lc.problem },
    { type: "array", get: (lc) => lc.solution },
    { type: "array", get: (lc) => lc.uniqueValueProp },
    { type: "array", get: (lc) => lc.unfairAdvantage },
    { type: "array", get: (lc) => lc.customerSegments },
    { type: "array", get: (lc) => lc.existingAlternatives },
    { type: "array", get: (lc) => lc.keyMetrics },
    { type: "array", get: (lc) => lc.highLevelConcept },
    { type: "array", get: (lc) => lc.channels },
    { type: "array", get: (lc) => lc.earlyAdopters },
    { type: "array", get: (lc) => lc.costStructure },
    { type: "array", get: (lc) => lc.revenueStreams },
  ]),

  extractFilterOptions: (items) => ({
    project: [
      ...new Set(items.map((lc) => lc.project).filter(Boolean)),
    ] as string[],
  }),
};

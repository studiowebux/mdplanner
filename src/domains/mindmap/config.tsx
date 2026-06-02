// Mindmap domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMindmap,
  Mindmap,
  MindmapNode,
  UpdateMindmap,
} from "../../types/mindmap.types.ts";
import { getMindmapService } from "../../singletons/services.ts";
import { ciIncludes, uniqueValues } from "../../utils/string.ts";
import {
  MINDMAP_FORM_FIELDS,
  MINDMAP_TABLE_COLUMNS,
  mindmapToRow,
} from "./constants.tsx";
import { MindmapCard } from "../../views/components/mindmap-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

// Recursive node-text match with early exit.
function nodeMatches(nodes: MindmapNode[], q: string): boolean {
  return nodes.some((n) => ciIncludes(n.text, q) || nodeMatches(n.children, q));
}

export const mindmapConfig: DomainConfig<
  Mindmap,
  CreateMindmap,
  UpdateMindmap
> = {
  name: "mindmap",
  singular: "Mindmap",
  plural: "Mindmaps",
  path: "/mindmaps",
  ssePrefix: "mindmap",
  styles: ["/css/views/mindmaps.css"],
  emptyMessage: "No mindmaps yet. Create one to get started.",
  defaultView: "card",

  // `notes` is edited in-place on the detail page via "Edit Mode".
  // (The bullet-tree itself uses a bespoke textarea editor — that's the
  // agreed exception per the canonical edit-mode pattern.)
  inlineEditFields: ["notes"],

  stateKeys: ["view", "project", "q", "sort", "order"],
  columns: MINDMAP_TABLE_COLUMNS,
  formFields: MINDMAP_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: mindmapToRow,

  Card: ({ item, q }) => <MindmapCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(MINDMAP_FORM_FIELDS, body) as CreateMindmap,

  parseUpdate: (body) =>
    parseFormBody(MINDMAP_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateMindmap>,

  getService: () => getMindmapService(),
  projectField: "project",

  extractFilterOptions: (items) => ({
    project: uniqueValues(items, (m) => m.project),
  }),

  searchPredicate: (item, q) =>
    ciIncludes(item.title, q) ||
    ciIncludes(item.notes, q) ||
    nodeMatches(item.nodes, q),
};

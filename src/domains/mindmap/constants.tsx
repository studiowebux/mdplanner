// Mindmap domain constants — table columns, form fields, row mapper.

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Mindmap, MindmapNode } from "../../types/mindmap.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Node tree helpers
// ---------------------------------------------------------------------------

export function countAllNodes(nodes: MindmapNode[]): number {
  return nodes.reduce(
    (sum, n) => sum + 1 + countAllNodes(n.children),
    0,
  );
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("mindmap", "mindmaps-form-container");

export const MINDMAP_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/mindmaps/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "project", label: "Project", sortable: true },
  { key: "nodeCount", label: "Nodes", sortable: true },
  {
    key: "updated",
    label: "Updated",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields — mirror MindmapSchema constraints
// ---------------------------------------------------------------------------

export const MINDMAP_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    required: true,
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function mindmapToRow(m: Mindmap): Record<string, unknown> {
  return {
    id: m.id,
    title: m.title,
    project: m.project,
    nodeCount: countAllNodes(m.nodes),
    updated: m.updatedAt,
  };
}

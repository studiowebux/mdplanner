import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "lean-canvases",
  "lean-canvases-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const LEAN_CANVAS_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/lean-canvases/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v) =>
      v ? <span class="badge badge--neutral">{String(v)}</span> : null,
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
  },
  {
    key: "completedSectionsDisplay",
    label: "Sections",
    sortable: true,
  },
  {
    key: "completionPct",
    label: "Complete",
    sortable: true,
    render: (v) => `${v}%`,
  },
  {
    key: "updatedAtDisplay",
    label: "Updated",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

// Sidenav handles only simple inputs (create + edit). The 12 canvas sections
// are bullet-list arrays edited in place on the detail page (?editing=true) —
// see src/views/lean-canvases/routes.tsx. Section textareas were removed here
// because parseFormBody saves them as raw strings, which buildBody then
// iterates char-by-char, corrupting the data.
export const LEAN_CANVAS_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "text",
    name: "project",
    label: "Project",
  },
  {
    type: "date",
    name: "date",
    label: "Date",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function leanCanvasToRow(lc: LeanCanvas): Record<string, unknown> {
  return {
    id: lc.id,
    title: lc.title,
    project: lc.project ?? "",
    date: lc.date ?? "",
    completedSectionsDisplay: `${lc.completedSections}/12`,
    completionPct: lc.completionPct,
    updatedAtDisplay: formatDate(lc.updatedAt),
  };
}

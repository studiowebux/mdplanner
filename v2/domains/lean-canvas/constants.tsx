import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/lean-canvases/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/lean-canvases/${row.id}/edit`}
      hx-target="#lean-canvases-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/lean-canvases/${row.id}`}
      hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
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
  {
    type: "textarea",
    name: "problem",
    label: "Problem",
    rows: 3,
  },
  {
    type: "textarea",
    name: "solution",
    label: "Solution",
    rows: 3,
  },
  {
    type: "textarea",
    name: "uniqueValueProp",
    label: "Unique Value Proposition",
    rows: 3,
  },
  {
    type: "textarea",
    name: "unfairAdvantage",
    label: "Unfair Advantage",
    rows: 3,
  },
  {
    type: "textarea",
    name: "customerSegments",
    label: "Customer Segments",
    rows: 3,
  },
  {
    type: "textarea",
    name: "existingAlternatives",
    label: "Existing Alternatives",
    rows: 3,
  },
  {
    type: "textarea",
    name: "keyMetrics",
    label: "Key Metrics",
    rows: 3,
  },
  {
    type: "textarea",
    name: "highLevelConcept",
    label: "High-Level Concept",
    rows: 2,
  },
  {
    type: "textarea",
    name: "channels",
    label: "Channels",
    rows: 3,
  },
  {
    type: "textarea",
    name: "earlyAdopters",
    label: "Early Adopters",
    rows: 3,
  },
  {
    type: "textarea",
    name: "costStructure",
    label: "Cost Structure",
    rows: 3,
  },
  {
    type: "textarea",
    name: "revenueStreams",
    label: "Revenue Streams",
    rows: 3,
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

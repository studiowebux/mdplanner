import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Retrospective } from "../../types/retrospective.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "retrospectives",
  "retrospectives-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const RETROSPECTIVE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/retrospectives/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (v) => (
      <span class={`badge badge--${v === "closed" ? "success" : "warning"}`}>
        {String(v)}
      </span>
    ),
  },
  {
    key: "itemCount",
    label: "Items",
    sortable: true,
  },
  {
    key: "createdAtDisplay",
    label: "Created",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const RETROSPECTIVE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    type: "textarea",
    name: "continue",
    label: "Continue (Went Well)",
    rows: 4,
  },
  {
    type: "textarea",
    name: "stop",
    label: "Stop (Needs Improvement)",
    rows: 4,
  },
  {
    type: "textarea",
    name: "start",
    label: "Start (Actions)",
    rows: 4,
  },
  {
    type: "textarea",
    name: "participants",
    label: "Participants (one per line)",
    rows: 3,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function countItems(r: Retrospective): number {
  return r.continue.length + r.stop.length + r.start.length;
}

export function retrospectiveToRow(r: Retrospective): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    date: r.date ?? "",
    status: r.status,
    itemCount: countItems(r),
    createdAtDisplay: formatDate(r.createdAt),
  };
}

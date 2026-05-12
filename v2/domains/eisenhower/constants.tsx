// Eisenhower Matrix domain constants.

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Eisenhower } from "../../types/eisenhower.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Quadrant constants — shared with repository and views
// ---------------------------------------------------------------------------

export const EISENHOWER_QUADRANT_KEYS = [
  "urgentImportant",
  "notUrgentImportant",
  "urgentNotImportant",
  "notUrgentNotImportant",
] as const;

export type EisenhowerQuadrantKey = (typeof EISENHOWER_QUADRANT_KEYS)[number];

export const EISENHOWER_QUADRANT_META: Record<
  EisenhowerQuadrantKey,
  { label: string; subtitle: string; modifier: string; singular: string }
> = {
  urgentImportant: {
    label: "Urgent & Important",
    subtitle: "Do First",
    modifier: "q1",
    singular: "item",
  },
  notUrgentImportant: {
    label: "Not Urgent & Important",
    subtitle: "Schedule",
    modifier: "q2",
    singular: "item",
  },
  urgentNotImportant: {
    label: "Urgent & Not Important",
    subtitle: "Delegate",
    modifier: "q3",
    singular: "item",
  },
  notUrgentNotImportant: {
    label: "Not Urgent & Not Important",
    subtitle: "Eliminate",
    modifier: "q4",
    singular: "item",
  },
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "eisenhower",
  "eisenhower-form-container",
);

export const EISENHOWER_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/eisenhower/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "project", label: "Project", sortable: true },
  { key: "q1Count", label: "Q1", sortable: true },
  { key: "q2Count", label: "Q2", sortable: true },
  { key: "q3Count", label: "Q3", sortable: true },
  { key: "q4Count", label: "Q4", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const EISENHOWER_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  { type: "date", name: "date", label: "Date" },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function eisenhowerToRow(e: Eisenhower): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    project: e.project ?? "",
    q1Count: e.urgentImportant.length,
    q2Count: e.notUrgentImportant.length,
    q3Count: e.urgentNotImportant.length,
    q4Count: e.notUrgentNotImportant.length,
  };
}

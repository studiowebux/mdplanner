import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { StrategicLevelsBuilder } from "../../types/strategic-levels.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "strategic-levels",
  "strategic-levels-form-container",
);

export const STRATEGIC_LEVELS_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/strategic-levels/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "date", label: "Date", sortable: true },
  { key: "levelCount", label: "Levels", sortable: false },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const STRATEGIC_LEVELS_FORM_FIELDS: FieldDef[] = [
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
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function strategicLevelsToRow(
  b: StrategicLevelsBuilder,
): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    date: b.date,
    levelCount: b.levels.length,
  };
}

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { ProjectValueBoard } from "../../types/project-value-board.types.ts";
import type { ProjectValueBoardSectionKey } from "../../types/project-value-board.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Section metadata — drives the visual board layout
// ---------------------------------------------------------------------------

export const PROJECT_VALUE_BOARD_SECTION_META: Record<
  ProjectValueBoardSectionKey,
  { label: string; singular: string; modifier: string; gridArea: string }
> = {
  customerSegments: {
    label: "Customer Segments",
    singular: "segment",
    modifier: "blue",
    gridArea: "cs",
  },
  problem: {
    label: "Problem",
    singular: "problem",
    modifier: "red",
    gridArea: "pr",
  },
  solution: {
    label: "Solution",
    singular: "solution",
    modifier: "green",
    gridArea: "sl",
  },
  benefit: {
    label: "Benefit",
    singular: "benefit",
    modifier: "yellow",
    gridArea: "bn",
  },
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "project-value",
  "project-value-form-container",
);

export const PROJECT_VALUE_BOARD_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/project-value/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "date", label: "Date", sortable: true },
  { key: "project", label: "Project", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const PROJECT_VALUE_BOARD_FORM_FIELDS: FieldDef[] = [
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
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 3,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function projectValueBoardToRow(
  b: ProjectValueBoard,
): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    date: b.date,
    project: b.project ?? "",
  };
}

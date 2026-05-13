import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Fishbone } from "../../types/fishbone.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("fishbone", "fishbone-form-container");

export const FISHBONE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/fishbones/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "description", label: "Problem", sortable: false },
  { key: "project", label: "Project", sortable: true },
  { key: "causeCount", label: "Causes", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const FISHBONE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "textarea",
    name: "description",
    label: "Problem Statement",
    rows: 3,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function fishboneToRow(f: Fishbone): Record<string, unknown> {
  return {
    id: f.id,
    title: f.title,
    description: f.description ?? "",
    project: f.project ?? "",
    causeCount: f.causes.length,
  };
}

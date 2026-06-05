import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { C4Component } from "../../types/c4.types.ts";
import { C4_LEVELS } from "../../types/c4.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";

export { C4_LEVELS };

// ---------------------------------------------------------------------------
// Level metadata
// ---------------------------------------------------------------------------

export const C4_LEVEL_LABELS: Record<string, string> = {
  context: "Context",
  container: "Container",
  component: "Component",
  code: "Code",
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("c4", "c4-form-container");

export const C4_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <button
        type="button"
        class="btn-link"
        hx-get={`/c4/${row.id}/edit`}
        hx-target="#c4-form-container"
        hx-swap="innerHTML"
      >
        <Highlight text={String(v)} q={row._q as string} />
      </button>
    ),
  },
  { key: "level", label: "Level", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "technology", label: "Technology", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const C4_FORM_FIELDS: FieldDef[] = [
  { type: "hidden", name: "diagram" },
  { type: "text", name: "name", label: "Name", required: true, maxLength: 200 },
  {
    type: "select",
    name: "level",
    label: "Level",
    required: true,
    options: C4_LEVELS.map((l) => ({ value: l, label: C4_LEVEL_LABELS[l] })),
  },
  {
    type: "text",
    name: "type",
    label: "Type",
    required: true,
    placeholder: "e.g. Person, Service, Database",
  },
  {
    type: "text",
    name: "technology",
    label: "Technology",
    placeholder: "e.g. Deno, TypeScript",
  },
  { type: "textarea", name: "description", label: "Description", rows: 3 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function c4ToRow(c: C4Component): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    level: C4_LEVEL_LABELS[c.level] ?? c.level,
    type: c.type,
    technology: c.technology ?? "",
  };
}

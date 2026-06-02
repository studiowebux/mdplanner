import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { BrainstormTemplate } from "../../types/brainstorm-template.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "brainstorm-templates",
  "brainstorm-templates-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const BRAINSTORM_TEMPLATE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/brainstorm-templates/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "categoriesDisplay",
    label: "Categories",
    sortable: false,
  },
  {
    key: "questionCount",
    label: "Questions",
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

export const BRAINSTORM_TEMPLATE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "tags",
    name: "categories",
    label: "Categories",
    placeholder: "Add category and press Enter...",
  },
  {
    type: "textarea",
    name: "description",
    label: "Description",
    rows: 3,
  },
  {
    type: "textarea",
    name: "questions",
    label: "Questions (one per line)",
    rows: 8,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function brainstormTemplateToRow(
  t: BrainstormTemplate,
): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    categoriesDisplay: t.categories?.join(", ") ?? "",
    questionCount: t.questions.length,
    createdAtDisplay: formatDate(t.createdAt),
  };
}

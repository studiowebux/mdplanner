import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { ReflectionTemplate } from "../../types/reflection-template.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "reflection-templates",
  "reflection-templates-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const REFLECTION_TEMPLATE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/reflection-templates/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "periodDisplay",
    label: "Period",
    sortable: true,
  },
  {
    key: "categoriesDisplay",
    label: "Categories",
    sortable: false,
  },
  {
    key: "promptCount",
    label: "Prompts",
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

export const REFLECTION_TEMPLATE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "period",
    label: "Suggested Period",
    options: [
      { value: "", label: "Any" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "annual", label: "Annual" },
    ],
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
    name: "prompts",
    label: "Prompts (one per line)",
    rows: 8,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function reflectionTemplateToRow(
  t: ReflectionTemplate,
): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    periodDisplay: t.period ?? "",
    categoriesDisplay: t.categories?.join(", ") ?? "",
    promptCount: t.prompts.length,
    createdAtDisplay: formatDate(t.createdAt),
  };
}
